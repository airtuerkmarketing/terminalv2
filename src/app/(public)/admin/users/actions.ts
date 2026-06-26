"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import {
  bulkInvite,
  createTeamMember,
  exportUsersLog,
  getTeamMemberBrands,
  getUserActivityLog,
  getUserChatHistory,
  inviteUser,
  logActivity,
  updateUserRole,
  type ActivityLogPage,
  type BrandRef,
  type BulkInviteResult,
  type ChatSessionItem,
  type Role,
} from "@/lib/users";

/**
 * Lazy-load a user's activity log for the Stage 7B detail modal's "Aktivität"
 * tab. super_admin-gated (the panel itself is super_admin-only). `userId` is the
 * auth/profile id (user_activity_log.user_id = the actor's auth id), so the modal
 * passes the team member's profileId — only ever set for active/invited members.
 */
export async function loadUserActivity(userId: string, limit?: number): Promise<ActivityLogPage> {
  await requireSuperAdmin();
  return getUserActivityLog(userId, { limit: limit ?? 20 });
}

/**
 * Lazy-load a user's AI-chat history for the detail modal's "KI-Chat" tab.
 * super_admin-ONLY: the requireSuperAdmin gate matches the DB-level guarantee
 * (the ai_chat_* RLS only grants cross-user read to is_super_admin()), so a
 * regular admin can never reach another user's chat content. The access itself is
 * recorded in the activity log (DSGVO audit trail) since this surfaces employees'
 * verbatim questions. `userId` is the team member's profileId (= the auth id on
 * ai_chat_sessions.user_id) — only set for active/invited members.
 */
export async function loadUserChat(userId: string, sessionLimit?: number): Promise<ChatSessionItem[]> {
  const identity = await requireSuperAdmin();
  const history = await getUserChatHistory(userId, { sessionLimit });
  await logActivity({
    userId: identity.userId,
    action: "view_user_chat",
    resourceType: "profile",
    resourceId: userId,
    metadata: { targetUserId: userId, sessions: history.length },
  });
  return history;
}

export type UpdateRoleResult = { ok: true } | { ok: false; error: string };

/**
 * Change a user's role from the detail-modal role picker (Stage 7C-light).
 * requireSuperAdmin gates entry; updateUserRole (Stage 6) does the RLS-scoped
 * write so the migration 0032 escalation guard is the real boundary (only
 * super_admins can change roles) and its in-code SELF_LOCK blocks self-changes.
 * Maps the known error strings to friendly German messages for the UI.
 */
export async function updateUserRoleAction(userId: string, newRole: Role): Promise<UpdateRoleResult> {
  try {
    await requireSuperAdmin();
    await updateUserRole(userId, newRole);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    const error =
      msg === "SELF_LOCK"
        ? "You cannot change your own role."
        : msg === "NOT_AUTHORIZED"
          ? "You do not have permission for this action."
          : msg === "NOT_AUTHENTICATED"
            ? "Please sign in."
            : msg === "NOT_FOUND"
              ? "User not found."
              : "Action failed.";
    return { ok: false, error };
  }
}

// ── Shared token → German message mapping (invite / bulk / create) ───────────

/**
 * Maps the stable users.ts error tokens to friendly German messages for the
 * admin panel. RATE_LIMIT carries a "<seconds>" suffix, so it is matched by
 * prefix before the exact-match switch. Kept separate from updateUserRoleAction's
 * inline mapping above (that one predates AP 2 and has its own role-specific
 * wording); new actions share this helper.
 */
function toGermanMessage(err: unknown): string {
  if (!(err instanceof Error)) return "An unknown error occurred.";
  const msg = err.message;

  if (msg.startsWith("RATE_LIMIT:")) {
    const seconds = msg.split(":")[1];
    return `Please wait another ${seconds} seconds before inviting again.`;
  }

  switch (msg) {
    case "NOT_AUTHENTICATED":
      return "You are not signed in.";
    case "NOT_AUTHORIZED":
      return "You do not have permission for this action.";
    case "SELF_LOCK":
      return "This action is not allowed on yourself.";
    case "NO_TEAM_MEMBER":
      return "Team member not found.";
    case "NO_EMAIL":
      return "This team member has no email address.";
    case "PRIVATE_EMAIL_BLOCKED":
      return "Private email — invitation blocked. Please set up an @airtuerk.de address first.";
    case "INVALID_NAME":
      return "Please provide a first and last name.";
    case "INVALID_EMAIL":
      return "Please provide a valid email address.";
    case "DUPLICATE_EMAIL":
      return "This email address is already taken.";
    case "INSERT_FAILED":
      return "Save failed. Please try again.";
    case "INVITE_FAILED":
      return "The invitation could not be sent.";
    case "NOT_FOUND":
      return "Entry not found.";
    default:
      return `Error: ${msg}`;
  }
}

// ── Invite a single team member ──────────────────────────────────────────────

export type InviteResult = { ok: true } | { ok: false; error: string };

/**
 * Invite one existing team member by their team_member id. requireAdmin gates
 * entry (doppel-guard: inviteUser re-checks + applies its tier guard + the
 * private-email / rate-limit guards). super_admin role grants need a super_admin
 * actor — handled inside inviteUser when a role is passed; this action invites
 * with the trigger-assigned default role (no explicit role).
 */
export async function inviteUserAction(teamMemberId: string): Promise<InviteResult> {
  try {
    await requireAdmin();
    await inviteUser({ teamMemberId });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

// ── Bulk invite ──────────────────────────────────────────────────────────────

export type BulkResult =
  | { ok: true; sent: number; failed: number; failures: BulkInviteResult["failed"] }
  | { ok: false; error: string };

/**
 * Invite many team members at once. requireAdmin gates entry; bulkInvite invites
 * sequentially with per-item isolation, so the result reports counts plus the
 * per-item failure list (raw tokens — the client can map them or just show counts).
 */
export async function bulkInviteAction(teamMemberIds: string[]): Promise<BulkResult> {
  try {
    await requireAdmin();
    const result = await bulkInvite(teamMemberIds);
    revalidatePath("/admin/users");
    return { ok: true, sent: result.sent.length, failed: result.failed.length, failures: result.failed };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

// ── Create a new team member (pre-seed) ──────────────────────────────────────

export type CreateResult = { ok: true; teamMemberId: string } | { ok: false; error: string };

/**
 * Create a new team_members row from the admin panel. A "super_admin"
 * intendedRole requires a super_admin actor (doppel-guard: createTeamMember
 * re-checks); everything else needs an admin. The auth account is minted later
 * via inviteUserAction.
 */
// ── Brand assignments (per-user permissions tab) ─────────────────────────────

export type BrandsResult = { ok: true; brands: BrandRef[] } | { ok: false; error: string };

/**
 * Load a team member's brand assignments for the detail-modal "Berechtigungen"
 * tab. requireAdmin gates entry (doppel-guard: getTeamMemberBrands re-checks).
 * team_member-keyed, so it works for not-yet-invited people too.
 */
export async function getTeamMemberBrandsAction(teamMemberId: string): Promise<BrandsResult> {
  try {
    await requireAdmin();
    const brands = await getTeamMemberBrands(teamMemberId);
    return { ok: true, brands };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

export async function createTeamMemberAction(input: {
  firstName: string;
  lastName: string;
  email: string;
  department?: string | null;
  position?: string | null;
  intendedRole?: Role;
}): Promise<CreateResult> {
  try {
    if (input.intendedRole === "super_admin") {
      await requireSuperAdmin();
    } else {
      await requireAdmin();
    }
    const { teamMemberId } = await createTeamMember(input);
    revalidatePath("/admin/users");
    return { ok: true, teamMemberId };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

// ── Export users CSV (audit log) ─────────────────────────────────────────────

export type ExportResult = { ok: true } | { ok: false; error: string };

/**
 * Audit hook for the bulk CSV export (Phase 5). The file itself is built +
 * downloaded client-side; this only records the action in user_activity_log.
 * requireSuperAdmin gates entry (doppel-guard: exportUsersLog re-checks). No
 * revalidatePath — an export mutates no on-page data.
 */
export async function exportUsersAction(params: {
  count: number;
  scope: "selection" | "filtered";
}): Promise<ExportResult> {
  try {
    await requireSuperAdmin();
    await exportUsersLog(params);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

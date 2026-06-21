"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { getUserActivityLog, updateUserRole, type ActivityLogPage, type Role } from "@/lib/users";

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
        ? "Du kannst deine eigene Rolle nicht ändern."
        : msg === "NOT_AUTHORIZED"
          ? "Keine Berechtigung für diese Aktion."
          : msg === "NOT_AUTHENTICATED"
            ? "Bitte melde dich an."
            : msg === "NOT_FOUND"
              ? "Benutzer nicht gefunden."
              : "Aktion fehlgeschlagen.";
    return { ok: false, error };
  }
}

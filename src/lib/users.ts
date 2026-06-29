/**
 * Server-only data access + auth gates for the User Panel (Stage 6 server layer).
 *
 * ┌─ SECURITY (read this before touching reads/writes) ────────────────────────┐
 * │ READS (getAllUsers/getUserById/getUserActivityLog/getUserStats) go through  │
 * │ the request-scoped `createClient()` so RLS applies the viewer's session:    │
 * │ an admin/super_admin sees every profile, a plain user sees only their own    │
 * │ row, and the activity log self-scopes (super_admin all / admin same-         │
 * │ department / user own). NEVER read the user list through the service-role     │
 * │ client — that bypasses the per-row visibility gate (same rule the Document   │
 * │ Library + Presentation Hub follow). The ONLY service-role reads here are for │
 * │ `auth.users.last_sign_in_at`, which the RLS/authenticated client cannot read │
 * │ at all ("permission denied for table users" — the very reason getIdentity()  │
 * │ avoids profiles_v). That enrichment exposes nothing extra: it is keyed to    │
 * │ the userIds the RLS read already authorized.                                 │
 * │                                                                              │
 * │ WRITES go through the service-role `createAdminClient()` AFTER an explicit    │
 * │ requireAdmin()/requireSuperAdmin() check — EXCEPT updateUserRole(), which     │
 * │ deliberately writes through the RLS client so the profiles role-escalation   │
 * │ guard (migration 0032) is the real gate: a plain admin physically cannot      │
 * │ change a role, only a super_admin can. See that function for details.        │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Error strings: requireAdmin/requireSuperAdmin throw "NOT_AUTHENTICATED" /
 * "NOT_AUTHORIZED" (matched verbatim by the action-layer error mappers — see
 * documents-library/actions.ts:toMessage). The write functions additionally throw
 * the stable domain strings "SELF_LOCK", "NO_TEAM_MEMBER", "INVALID_NAME",
 * "INVALID_FILE_TYPE", "FILE_TOO_LARGE", "NOT_FOUND" so the Stage-7 admin UI can
 * map them to friendly messages.
 *
 * AP 2 (user-management V1) adds these domain tokens:
 *   inviteUser:       "NO_EMAIL" (team_member has no email),
 *                     "PRIVATE_EMAIL_BLOCKED" (email not a corp domain — see isCorpEmail),
 *                     "RATE_LIMIT:<seconds>" (last invite < 60s ago — the suffix
 *                     is the remaining wait so the UI can show it).
 *   createTeamMember: "INVALID_EMAIL", "DUPLICATE_EMAIL", "INSERT_FAILED".
 *   updateOwnProfile: "NOT_LINKED" (no profiles.team_member_id),
 *                     "INVALID_DATE", "PHONE_TOO_LONG", "UPDATE_FAILED".
 *   bulkInvite aggregates per-item failures and never throws them (see below).
 *
 * Do not import this module from a Client Component (pass plain DTOs instead).
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIdentity, requireAdmin, requireSuperAdmin, type Role } from "@/lib/auth";
import { isCorpEmail } from "@/lib/corp-email";

export type { Role } from "@/lib/auth";

// ── Config constants (mirror the live schema; keep in sync with migrations) ──

/** 2 MB — matches the avatars bucket `file_size_limit` (migration 0038). */
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** MIME → file extension. Keys MUST equal the avatars bucket `allowed_mime_types` (migration 0038). */
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const AVATARS_BUCKET = "avatars";
/**
 * GoTrue's admin API takes a `ban_duration` (Go duration string), not a
 * `banned_until` timestamp. ~100 years ≈ an indefinite "soft deactivate"
 * (banned_until lands around the year 2126). Reactivation = ban_duration "none".
 */
const DEACTIVATE_BAN_DURATION = "876000h";
/**
 * The admin user list is bounded by company headcount (a handful to low dozens),
 * so getAllUsers fetches the filtered set in one shot and paginates in memory —
 * this keeps last_sign_in_at enrichment + the hasLogin filter consistent with
 * totalCount. This cap is the safety bound (also the listUsers page size).
 */
const MAX_USER_FETCH = 1000;

// ── DTOs (plain, client-safe shapes) ────────────────────────────────────────
// avatarUrl is the avatars-bucket PUBLIC url (the bucket is public by design,
// migration 0038) — not a private storage_path, so it is safe in a DTO.

export interface UserListItem {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: Role;
  department: string | null;
  avatarUrl: string | null;
  /** From auth.users (service-role enrichment); null if never signed in or not enriched. */
  lastSignInAt: string | null;
  teamMemberId: string | null;
}

export interface UserListPage {
  users: UserListItem[];
  /** Total matching the filters, BEFORE pagination (computed after all filters). */
  totalCount: number;
  hasMore: boolean;
}

export interface BrandRef {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  /** Resolved public URL of the brand logo (via brands.logo_asset_id → assets), or null. */
  logoUrl: string | null;
  isPrimary: boolean;
}

export interface UserDetail extends UserListItem {
  firstName: string | null;
  lastName: string | null;
  /** Salutation / honorific (team_members.title), or null. */
  title: string | null;
  position: string | null;
  phone: string | null;
  privatePhone: string | null;
  /** ISO date (YYYY-MM-DD) or null. Display ONLY when showBirthday is true (DSGVO opt-in). */
  dateOfBirth: string | null;
  showBirthday: boolean;
  statusLine: string | null;
  about: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  instagram: string | null;
  /** team_members.metadata jsonb (ad-hoc bag). Admin-view only; never on /team. */
  metadata: Record<string, unknown>;
  brands: BrandRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityLogPage {
  items: ActivityLogItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface UserStats {
  uploadCount: number;
  lastActivityAt: string | null;
  last30dActivityCount: number;
}

/** Filters for the user list. All optional; combined with AND. */
export interface UserFilters {
  department?: string;
  role?: Role;
  /** true = signed in at least once, false = never signed in (invited/pending). */
  hasLogin?: boolean;
  /** Free-text over name + email (case-insensitive substring). */
  q?: string;
}

export interface Pagination {
  limit?: number;
  offset?: number;
}

/** Input to logActivity. `userId` is the ACTOR (who performed the action). */
export interface LogActivityInput {
  /** The acting user's auth id. */
  userId: string;
  /** Free-form verb, e.g. "login", "upload_file", "edit_profile", "update_role". */
  action: string;
  /** "document" | "presentation" | "folder" | "profile" | "team_member" | null. */
  resourceType?: string | null;
  /** uuid of the affected resource (column is uuid-typed), or null. */
  resourceId?: string | null;
  /** Small jsonb payload of context (keep < 2 KB). */
  metadata?: Record<string, unknown>;
}

export interface UpdateUserProfilePatch {
  firstName?: string;
  lastName?: string;
  /** Salutation / honorific (team_members.title, ≤20 chars), or null to clear. */
  title?: string | null;
  /** Job title / position (team_members.position). */
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  /** Private phone — kept out of the public /team projection (DSGVO). */
  privatePhone?: string | null;
  dateOfBirth?: string | null;
  showBirthday?: boolean;
  /** Short status line, ≤50 chars (mirrors the DB CHECK). */
  statusLine?: string | null;
  about?: string | null;
  location?: string | null;
  company?: string | null;
  website?: string | null;
  github?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  /**
   * Shallow MERGE into team_members.metadata (jsonb). Keys with a value are
   * upserted; a key set to `null` is DELETED from the stored object. Reserved for
   * ad-hoc, non-queried annotations only — do NOT route typed/queried fields here.
   * `role` and `email` are intentionally absent (see adminUpdateUser).
   */
  metadata?: Record<string, unknown>;
}

export interface InviteUserInput {
  /**
   * REQUIRED — the team member to invite. The email to send to AND the
   * rate-limit timestamp are read from this row (the caller never supplies a
   * raw email anymore; an invite always targets an existing team_member).
   */
  teamMemberId: string;
  /**
   * Optional explicit role for the new profile. If omitted, the signup trigger
   * (handle_new_user, migration 0030) assigns the role from user_role_defaults.
   * Granting "admin"/"super_admin" still requires the actor to be a super_admin.
   */
  role?: Role;
}

export interface BulkInviteResult {
  /** team_member ids whose invite was sent successfully. */
  sent: string[];
  /** Per-item failures with the raw token reason (e.g. "PRIVATE_EMAIL_BLOCKED"). */
  failed: Array<{ teamMemberId: string; reason: string }>;
}

export interface CreateTeamMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  department?: string | null;
  position?: string | null;
  /** Default role the signup trigger should later assign; "user" if omitted. */
  intendedRole?: Role;
}

export interface UpdateOwnProfilePatch {
  /** Work / internal phone. */
  phone?: string | null;
  /** Private phone (kept out of the public /team projection). */
  privatePhone?: string | null;
  /** ISO date "YYYY-MM-DD", or null to clear. */
  dateOfBirth?: string | null;
  showBirthday?: boolean;
  /** Short status line, ≤50 chars (e.g. "Happy to work"). */
  statusLine?: string | null;
  about?: string | null;
  location?: string | null;
  company?: string | null;
  /** Portfolio / personal website (full URL or text). */
  website?: string | null;
  github?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}

/** Self-service profile, prefilled into the account form. */
export interface OwnProfile {
  // Read-only identity (never self-editable)
  teamMemberId: string;
  fullName: string | null;
  /** The login e-mail — read-only (changing it is an auth-level operation). */
  email: string | null;
  role: Role;
  position: string | null;
  department: string | null;
  avatarUrl: string | null;
  // Editable
  phone: string | null;
  privatePhone: string | null;
  dateOfBirth: string | null;
  showBirthday: boolean;
  statusLine: string | null;
  about: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  instagram: string | null;
}

// ── PostgREST row shapes (snake_case) + select strings ──────────────────────
// The supabase client here is untyped, so embeds come back loosely typed; the
// map* helpers take `unknown` and cast inside (same trick as presentations.ts),
// and embedded to-one relations arrive as object-or-array → normalized via one().

type AssetUrlRow = { public_url: string | null };
type BrandRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  logo: AssetUrlRow | AssetUrlRow[] | null;
};
type TmBrandRow = { is_primary: boolean; brands: BrandRow | BrandRow[] | null };

type TeamMemberListRel = {
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  avatar_asset_id: string | null;
  avatar: AssetUrlRow | AssetUrlRow[] | null;
};
type TeamMemberDetailRel = TeamMemberListRel & {
  title: string | null;
  position: string | null;
  phone: string | null;
  private_phone: string | null;
  date_of_birth: string | null;
  show_birthday: boolean;
  status_line: string | null;
  about: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  instagram: string | null;
  metadata: Record<string, unknown> | null;
  team_member_brands: TmBrandRow[] | null;
};

type ProfileListRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  team_member_id: string | null;
  team_members: TeamMemberListRel | TeamMemberListRel[] | null;
};
type ProfileDetailRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  team_member_id: string | null;
  created_at: string;
  updated_at: string;
  team_members: TeamMemberDetailRel | TeamMemberDetailRel[] | null;
};
type ActivityRow = {
  id: number;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Avatar uses the explicit FK hint + `avatar:` alias (matches the proven
// team-directory query in pages.ts) so PostgREST resolves the embed deterministically.
const TM_LIST_EMBED =
  "first_name, last_name, department, avatar_asset_id, avatar:assets!team_members_avatar_asset_id_fkey(public_url)";
const TM_DETAIL_EMBED =
  "first_name, last_name, title, position, department, phone, private_phone, date_of_birth, show_birthday, status_line, about, location, company, website, github, linkedin, instagram, metadata, avatar_asset_id, avatar:assets!team_members_avatar_asset_id_fkey(public_url), team_member_brands(is_primary, brands(id, slug, name, short_name, logo:assets!brands_logo_asset_id_fkey(public_url)))";
const PROFILE_DETAIL_SELECT = `id, email, full_name, role, team_member_id, created_at, updated_at, team_members(${TM_DETAIL_EMBED})`;
const ACTIVITY_COLS = "id, action, resource_type, resource_id, metadata, created_at";

// ── Mapping helpers ──────────────────────────────────────────────────────────

/** Normalize a PostgREST to-one embed (object, or single-element array, or null). */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

/** full_name, else "First Last" from the team_member, else null. */
function composeFullName(explicit: string | null, tm: TeamMemberListRel | null): string | null {
  if (explicit && explicit.trim()) return explicit;
  const parts = [tm?.first_name, tm?.last_name].filter((s): s is string => !!s && !!s.trim());
  return parts.length ? parts.join(" ") : null;
}

function mapListItem(r0: unknown, lastSignInAt: string | null): UserListItem {
  const r = r0 as ProfileListRow;
  const tm = one(r.team_members);
  return {
    userId: r.id,
    fullName: composeFullName(r.full_name, tm),
    email: r.email,
    role: r.role as Role,
    department: tm?.department ?? null,
    avatarUrl: one(tm?.avatar)?.public_url ?? null,
    lastSignInAt,
    teamMemberId: r.team_member_id,
  };
}

/**
 * Map team_member_brands link rows → BrandRef[], primary first then alphabetical.
 * Shared by mapDetail (profiles-based) and getTeamMemberBrands (team_member-based)
 * so the brand DTO shape + ordering have a single source of truth. The logo is
 * resolved from the brands.logo_asset_id → assets embed (null when unset).
 */
function mapBrandRefs(links: TmBrandRow[] | null | undefined): BrandRef[] {
  return (links ?? [])
    .map((link) => {
      const b = one(link.brands);
      return b
        ? {
            id: b.id,
            slug: b.slug,
            name: b.name,
            shortName: b.short_name,
            logoUrl: one(b.logo)?.public_url ?? null,
            isPrimary: link.is_primary,
          }
        : null;
    })
    .filter((b): b is BrandRef => b !== null)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));
}

function mapDetail(r0: unknown, lastSignInAt: string | null): UserDetail {
  const r = r0 as ProfileDetailRow;
  const tm = one(r.team_members);
  const brands = mapBrandRefs(tm?.team_member_brands);
  return {
    userId: r.id,
    fullName: composeFullName(r.full_name, tm),
    email: r.email,
    role: r.role as Role,
    department: tm?.department ?? null,
    avatarUrl: one(tm?.avatar)?.public_url ?? null,
    lastSignInAt,
    teamMemberId: r.team_member_id,
    firstName: tm?.first_name ?? null,
    lastName: tm?.last_name ?? null,
    title: tm?.title ?? null,
    position: tm?.position ?? null,
    phone: tm?.phone ?? null,
    privatePhone: tm?.private_phone ?? null,
    dateOfBirth: tm?.date_of_birth ?? null,
    showBirthday: tm?.show_birthday ?? false,
    statusLine: tm?.status_line ?? null,
    about: tm?.about ?? null,
    location: tm?.location ?? null,
    company: tm?.company ?? null,
    website: tm?.website ?? null,
    github: tm?.github ?? null,
    linkedin: tm?.linkedin ?? null,
    instagram: tm?.instagram ?? null,
    metadata: tm?.metadata ?? {},
    brands,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapActivity(r0: unknown): ActivityLogItem {
  const r = r0 as ActivityRow;
  return {
    id: String(r.id),
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  };
}

function clampLimit(v: number | undefined, def: number, max = 200): number {
  return Math.min(Math.max(v ?? def, 1), max);
}

/**
 * Build a userId → last_sign_in_at map for the given profile ids (= auth.users.id).
 * Service-role ONLY — auth.users is unreadable by the RLS client AND not exposed to
 * PostgREST, so this goes through the `last_sign_in_for(ids)` SECURITY DEFINER RPC
 * (migration 20260628130001), a SINGLE bounded SELECT keyed on the ids actually in
 * hand. This replaced the old GoTrue `listUsers` pager that looped up to 50 pages
 * and pulled the whole auth.users object graph on every panel load (finding O4).
 * Returns an empty map when called with no ids or on any failure (best-effort —
 * callers fall back to lastSignInAt = null).
 */
async function fetchLastSignInMap(profileIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const ids = profileIds.filter((id): id is string => !!id);
  if (ids.length === 0) return map;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("last_sign_in_for", { ids });
    if (error || !data) return map;
    for (const u of data as { id: string; last_sign_in_at: string | null }[]) {
      map.set(u.id, u.last_sign_in_at ?? null);
    }
  } catch {
    // best-effort: callers fall back to lastSignInAt = null
  }
  return map;
}

// ── 1. User list (RLS read + service-role sign-in enrichment) ────────────────

/**
 * Paginated user list for the admin panel. RLS-scoped: the base read is the
 * `profiles` table with the team_member stammdaten (name, department, avatar)
 * embedded, so an admin sees everyone and a plain user sees only themselves.
 *
 * `role` + `department` are filtered DB-side (department needs an inner join on
 * the embed); `q` (name/email substring) and `hasLogin` are applied in memory
 * after the last_sign_in_at enrichment, then the result is sorted by name and
 * paginated — see MAX_USER_FETCH for why in-memory paging is correct at this
 * scale. `lastSignInAt` is enriched from auth.users only for admin viewers.
 */
export async function getAllUsers(
  filters?: UserFilters,
  pagination?: Pagination
): Promise<UserListPage> {
  const supabase = await createClient();
  const dept = filters?.department?.trim() || null;
  // Filtering the parent by an embedded column requires an inner join (!inner),
  // otherwise PostgREST would null the embed instead of dropping the row.
  const tmEmbed = dept ? `team_members!inner(${TM_LIST_EMBED})` : `team_members(${TM_LIST_EMBED})`;
  let query = supabase
    .from("profiles")
    .select(`id, email, full_name, role, team_member_id, ${tmEmbed}`)
    .limit(MAX_USER_FETCH);
  if (filters?.role) query = query.eq("role", filters.role);
  if (dept) query = query.eq("team_members.department", dept);

  const { data } = await query;
  const rows = (data ?? []) as unknown[];

  // Enrich last_sign_in_at (service-role) only for admin viewers — a plain user's
  // RLS read returns just their own row, and we don't run a privileged list for them.
  const identity = await getIdentity();
  const signInMap = identity?.isAdmin
    ? await fetchLastSignInMap(rows.map((r) => (r as ProfileListRow).id))
    : new Map<string, string | null>();

  let items = rows.map((r) => mapListItem(r, signInMap.get((r as ProfileListRow).id) ?? null));

  const q = filters?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((u) => `${u.fullName ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q));
  }
  if (filters?.hasLogin === true) items = items.filter((u) => u.lastSignInAt != null);
  else if (filters?.hasLogin === false) items = items.filter((u) => u.lastSignInAt == null);

  items.sort((a, b) =>
    (a.fullName ?? "￿").localeCompare(b.fullName ?? "￿") ||
    (a.email ?? "").localeCompare(b.email ?? "")
  );

  const totalCount = items.length;
  const limit = clampLimit(pagination?.limit, 50);
  const offset = Math.max(pagination?.offset ?? 0, 0);
  const users = items.slice(offset, offset + limit);
  return { users, totalCount, hasMore: offset + limit < totalCount };
}

// ── 2. Single user detail (RLS read + sign-in enrichment) ────────────────────

/**
 * Full detail for one user: profile + team_member stammdaten + assigned brands
 * (via the team_member_brands junction) + last_sign_in_at. RLS-scoped, so it
 * returns null when the viewer may not see that profile (a plain user requesting
 * someone else gets null). Wrapped in React cache() so the detail modal's parallel
 * reads within one request share a single DB round-trip. Because a non-null RLS
 * result means the viewer is authorized for this profile, the sign-in enrichment
 * (service-role) is gated by that read, not by a separate role check.
 */
export const getUserById = cache(async (userId: string): Promise<UserDetail | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_DETAIL_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  // Single-id sign-in enrichment via the same service-role RPC as the list reads
  // (O4) — a non-null RLS result above means the viewer is authorized for this row.
  const signInMap = await fetchLastSignInMap([userId]);
  return mapDetail(data, signInMap.get(userId) ?? null);
});

// ── 3. Activity log (RLS read) ───────────────────────────────────────────────

/**
 * One user's activity log, newest first, paginated. RLS auto-scopes the rows
 * (migration 0036): super_admin sees all, admin sees same-department subjects,
 * a user sees their own — so no explicit role check is needed here (requesting a
 * forbidden user simply yields an empty page). totalCount is a separate
 * RLS-scoped count so the UI can render "showing N of M".
 */
export async function getUserActivityLog(
  userId: string,
  pagination?: Pagination
): Promise<ActivityLogPage> {
  const limit = clampLimit(pagination?.limit, 50);
  const offset = Math.max(pagination?.offset ?? 0, 0);
  const supabase = await createClient();

  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("user_activity_log")
      .select(ACTIVITY_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit), // limit+1 rows → hasMore without a count
    supabase
      .from("user_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const rows = (data ?? []) as unknown[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapActivity);
  return { items, totalCount: count ?? items.length, hasMore };
}

// ── 4. Activity stats (RLS read) ─────────────────────────────────────────────

/**
 * Counters for the detail-modal header. All three reads are RLS-scoped against
 * user_activity_log (same visibility rules as getUserActivityLog). uploadCount
 * matches any "upload*" action; last30dActivityCount uses a 30-day window.
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [uploads, last30d, lastAct] = await Promise.all([
    supabase
      .from("user_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .ilike("action", "upload%"),
    supabase
      .from("user_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", cutoff),
    supabase
      .from("user_activity_log")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    uploadCount: uploads.count ?? 0,
    last30dActivityCount: last30d.count ?? 0,
    lastActivityAt: (lastAct.data as { created_at: string } | null)?.created_at ?? null,
  };
}

// ── 5. Update stammdaten (admin write to team_members) ───────────────────────

/**
 * Update a user's stammdaten. Writes to team_members (the single source of
 * stammdaten), NOT to profiles. requireAdmin; the write uses the service-role
 * client (team_members RLS is is_admin(), and this app layer is the real gate).
 * Throws NO_TEAM_MEMBER if the profile has no linked team_member, and INVALID_NAME
 * if a provided first/last name is blank (both columns are NOT NULL).
 */
export async function updateUserProfile(userId: string, patch: UpdateUserProfilePatch): Promise<void> {
  const identity = await requireAdmin();
  const admin = createAdminClient();

  const { data: prof } = await admin
    .from("profiles")
    .select("team_member_id")
    .eq("id", userId)
    .maybeSingle();
  const teamMemberId = (prof as { team_member_id: string | null } | null)?.team_member_id ?? null;
  if (!teamMemberId) throw new Error("NO_TEAM_MEMBER");

  const update: Record<string, unknown> = {};
  if (patch.firstName !== undefined) {
    const v = patch.firstName.trim();
    if (!v) throw new Error("INVALID_NAME");
    update.first_name = v;
  }
  if (patch.lastName !== undefined) {
    const v = patch.lastName.trim();
    if (!v) throw new Error("INVALID_NAME");
    update.last_name = v;
  }
  if (patch.department !== undefined) update.department = patch.department?.trim() || null;
  if (patch.phone !== undefined) update.phone = patch.phone?.trim() || null;
  if (patch.dateOfBirth !== undefined) update.date_of_birth = patch.dateOfBirth || null;
  if (patch.showBirthday !== undefined) update.show_birthday = patch.showBirthday;

  if (Object.keys(update).length === 0) return; // nothing to do
  // team_members carries an updated_at trigger (migration 0001), so no manual stamp.
  const { error } = await admin.from("team_members").update(update).eq("id", teamMemberId);
  if (error) throw error;

  await logActivity({
    userId: identity.userId,
    action: "edit_profile",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { targetUserId: userId, fields: Object.keys(update) },
  });
}

// ── 5b. Admin full edit (service-role write to team_members) ──────────────────

/**
 * Admin full-edit of a user's stammdaten — the superset of updateUserProfile,
 * keyed on the TEAM_MEMBER id (the admin panel's natural key — getAllTeamMembers
 * is team_members-based, and this works for the ~54 people with no auth account
 * yet, unlike a profiles-keyed path). Writes team_members via the SERVICE-ROLE
 * client AFTER requireSuperAdmin(): this edits ANOTHER user's row, the
 * team_self_update RLS policy only grants the SELF row, and the whole /admin/users
 * surface is super_admin-only — so the app-layer guard IS the gate. The new
 * 20260628130000 trigger additionally blocks a non-admin self-write to
 * title/metadata at the DB layer.
 *
 * Partial-update: only DEFINED patch keys are mapped (extra keys are ignored —
 * this whitelist is the only thing keeping `role`/`email` off this path).
 *
 * Two deliberate EXCLUSIONS:
 *  - role:  stays on updateUserRole (RLS client → the 20260620020000 escalation
 *           guard is the real boundary). Routing it through this service-role path
 *           would bypass that guard.
 *  - email: login identity owned by auth.users — a GoTrue mutation that can fail
 *           independently of the DB write. Out of v1 scope; passing it is ignored.
 *
 * Drift fix: when first/last name changes, profiles.full_name is the denormalized
 * greeting read RAW by getIdentity (auth.ts) → the sidebar. So a name edit also
 * re-stamps profiles.full_name (keyed by team_member_id; a no-op for not-yet-
 * invited people with no profile row). profiles has no updated_at trigger → manual
 * stamp. Best-effort: a re-stamp failure must not undo the stammdaten write.
 *
 * metadata: a SHALLOW MERGE (provided keys upsert; keys set to null are removed),
 * object-only + ≤4 KB serialized (defensive — it is an admin-controlled jsonb bag).
 *
 * Throws NO_TEAM_MEMBER, INVALID_NAME, TITLE_TOO_LONG (≤20), PHONE_TOO_LONG (≤50),
 * STATUS_TOO_LONG (≤50), VALUE_TOO_LONG, INVALID_DATE, INVALID_METADATA, UPDATE_FAILED.
 */
export async function adminUpdateUser(
  teamMemberId: string,
  patch: UpdateUserProfilePatch
): Promise<void> {
  const identity = await requireSuperAdmin();
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};

  // Required names (NOT NULL columns — reject a blank value).
  if (patch.firstName !== undefined) {
    const v = patch.firstName.trim();
    if (!v) throw new Error("INVALID_NAME");
    update.first_name = v;
  }
  if (patch.lastName !== undefined) {
    const v = patch.lastName.trim();
    if (!v) throw new Error("INVALID_NAME");
    update.last_name = v;
  }

  // Title — honorific, ≤20 (mirrors the team_members_title_len CHECK).
  if (patch.title !== undefined) {
    const v = patch.title?.trim() || null;
    if (v && v.length > 20) throw new Error("TITLE_TOO_LONG");
    update.title = v;
  }

  if (patch.position !== undefined) update.position = patch.position?.trim() || null;
  if (patch.department !== undefined) update.department = patch.department?.trim() || null;

  // Phones (≤50) — same caps as updateOwnProfile.
  for (const [key, col] of [
    ["phone", "phone"],
    ["privatePhone", "private_phone"],
  ] as const) {
    if (patch[key] === undefined) continue;
    const v = patch[key]?.trim() || null;
    if (v && v.length > 50) throw new Error("PHONE_TOO_LONG");
    update[col] = v;
  }

  if (patch.dateOfBirth !== undefined) {
    if (patch.dateOfBirth === null || patch.dateOfBirth.trim() === "") {
      update.date_of_birth = null;
    } else {
      const trimmed = patch.dateOfBirth.trim();
      const d = new Date(trimmed);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || isNaN(d.getTime())) {
        throw new Error("INVALID_DATE");
      }
      update.date_of_birth = trimmed;
    }
  }

  if (patch.showBirthday !== undefined) update.show_birthday = !!patch.showBirthday;

  // Status line — hard 50-char cap (mirrors the DB CHECK).
  if (patch.statusLine !== undefined) {
    const v = patch.statusLine?.trim() || null;
    if (v && v.length > 50) throw new Error("STATUS_TOO_LONG");
    update.status_line = v;
  }

  // Free-text + links (column → max length) — same caps as updateOwnProfile.
  for (const [key, col, max] of [
    ["about", "about", 2000],
    ["location", "location", 120],
    ["company", "company", 120],
    ["website", "website", 300],
    ["github", "github", 300],
    ["linkedin", "linkedin", 300],
    ["instagram", "instagram", 300],
  ] as const) {
    if (patch[key] === undefined) continue;
    const v = patch[key]?.trim() || null;
    if (v && v.length > max) throw new Error("VALUE_TOO_LONG");
    update[col] = v;
  }

  // metadata: shallow merge (read-modify-write). Object-only + ≤4 KB (defensive).
  if (patch.metadata !== undefined) {
    const m = patch.metadata;
    if (m === null || typeof m !== "object" || Array.isArray(m)) throw new Error("INVALID_METADATA");
    if (Object.keys(m).length > 0) {
      const { data: cur } = await admin
        .from("team_members")
        .select("metadata")
        .eq("id", teamMemberId)
        .maybeSingle();
      const base = ((cur as { metadata: Record<string, unknown> | null } | null)?.metadata) ?? {};
      const merged: Record<string, unknown> = { ...base };
      for (const [k, val] of Object.entries(m)) {
        if (val === null) delete merged[k];
        else merged[k] = val;
      }
      if (JSON.stringify(merged).length > 4096) throw new Error("INVALID_METADATA");
      update.metadata = merged;
    }
  }

  if (Object.keys(update).length === 0) return; // nothing to do

  // team_members has an updated_at trigger (no manual stamp). RETURNING the names
  // folds the post-write read-back for the full_name re-stamp; an empty result
  // means the row doesn't exist → NO_TEAM_MEMBER.
  const { data: upd, error } = await admin
    .from("team_members")
    .update(update)
    .eq("id", teamMemberId)
    .select("id, first_name, last_name");
  if (error) throw new Error("UPDATE_FAILED");
  if (!upd || upd.length === 0) throw new Error("NO_TEAM_MEMBER");

  // Drift fix: keep profiles.full_name (the sidebar greeting) honest on a name
  // change. Keyed by team_member_id (unique partial index) → single-row, no
  // pre-SELECT; a no-op when no profile is linked. profiles has no updated_at
  // trigger → manual stamp. Best-effort (must not undo the stammdaten write).
  if (update.first_name !== undefined || update.last_name !== undefined) {
    const row = upd[0] as { first_name: string | null; last_name: string | null };
    const newFullName =
      [row.first_name, row.last_name].filter((s) => s && s.trim()).join(" ").trim() || null;
    const { error: pErr } = await admin
      .from("profiles")
      .update({ full_name: newFullName, updated_at: new Date().toISOString() })
      .eq("team_member_id", teamMemberId);
    if (pErr) console.error("[adminUpdateUser] full_name re-stamp failed:", pErr.message);
  }

  await logActivity({
    userId: identity.userId,
    action: "edit_profile",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { teamMemberId, fields: Object.keys(update) },
  });
}

// ── 6. Update role (RLS write — escalation guard is the gate) ────────────────

/**
 * Change a user's role. requireAdmin is the coarse entry gate, but the write
 * deliberately goes through the RLS client so the profiles role-escalation guard
 * (migration 0032) is the REAL boundary: its WITH CHECK only lets the `role`
 * column change when the actor is a super_admin, so a plain admin is physically
 * blocked (we map that rejection back to NOT_AUTHORIZED). A code-level self-lock
 * additionally stops a super_admin from changing their OWN role — the guard does
 * not (is_super_admin() passes for self), and self-demotion is a lockout risk.
 * profiles has no updated_at trigger, so we stamp it explicitly (migration 0034).
 */
export async function updateUserRole(userId: string, newRole: Role): Promise<void> {
  const identity = await requireAdmin();
  if (userId === identity.userId) throw new Error("SELF_LOCK");

  const supabase = await createClient(); // RLS client → 0032 guard applies on UPDATE
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id");

  if (error) {
    // 42501 = RLS violation (a non-super-admin trying to change a role).
    if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
      throw new Error("NOT_AUTHORIZED");
    }
    throw error;
  }
  if (!data || data.length === 0) throw new Error("NOT_FOUND");

  await logActivity({
    userId: identity.userId,
    action: "update_role",
    resourceType: "profile",
    resourceId: userId,
    metadata: { targetUserId: userId, newRole },
  });
}

// ── 7. Invite user (service-role) ────────────────────────────────────────────

/**
 * Invite an existing team_member by email. requireAdmin, PLUS a tier guard:
 * granting an admin or super_admin role requires the actor to be a super_admin —
 * this mirrors the 0032 escalation guard for the create-path (the guard only
 * protects RLS UPDATEs on existing rows, but invite mints a fresh profile via the
 * service role, which would otherwise let a plain admin self-escalate by proxy).
 *
 * AP 2 hardening (user-management V1):
 *  - The invite ALWAYS targets a team_member (teamMemberId is required). The
 *    address to send to is read from team_members.email, never supplied raw — so
 *    one place owns "who is invitable".
 *  - Variante A (USER_MGMT_RECON §8): only company addresses
 *    (@airtuerk.de / @airtuerkholidays.de) may be invited. Staff on a private
 *    email are invite-locked (PRIVATE_EMAIL_BLOCKED) until a corp address exists.
 *  - 60s rate-limit via team_members.last_invited_at (AP 1, migration
 *    20260624111148): a re-invite inside the window throws "RATE_LIMIT:<seconds>".
 *
 * Flow: auth.admin.inviteUserByEmail mints the auth user (the email link lands on
 * /auth/confirm with a redirectTo, and carries full_name in user_metadata so the
 * handle_new_user trigger fills profiles.full_name). We then set the
 * force_password_change app_metadata flag (first-login set-password backstop —
 * cleared by updatePasswordAction). The handle_new_user trigger (migration 0030)
 * synchronously inserts the profile with the email's default role (from
 * user_role_defaults), so we UPDATE that row to the bidirectional team_member link
 * (migrations 0034/0035) and, only if an explicit role was passed, override the
 * role. Finally we stamp last_invited_at (so the rate-limit + UI "letzte
 * Invitation" display work). Returns the new auth id.
 */
export async function inviteUser(input: InviteUserInput): Promise<{ userId: string }> {
  const identity = await requireAdmin();
  if (input.role && input.role !== "user" && !identity.isSuperAdmin) {
    throw new Error("NOT_AUTHORIZED");
  }

  const teamMemberId = input.teamMemberId;
  const admin = createAdminClient();

  // Resolve the target: the address to invite + the rate-limit timestamp + the
  // name (seeded into user_metadata so handle_new_user fills profiles.full_name).
  const { data: tm } = await admin
    .from("team_members")
    .select("id, email, first_name, last_name, last_invited_at")
    .eq("id", teamMemberId)
    .maybeSingle();
  const tmRow = tm as {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    last_invited_at: string | null;
  } | null;
  if (!tmRow) throw new Error("NO_TEAM_MEMBER");
  if (!tmRow.email) throw new Error("NO_EMAIL");
  const fullName =
    [tmRow.first_name, tmRow.last_name].filter((s) => s && s.trim()).join(" ").trim() || undefined;

  const email = tmRow.email.trim().toLowerCase();
  // Variante A: only corporate addresses are invitable (single source of truth in
  // @/lib/corp-email so the client pills enforce the same rule without a round-trip).
  if (!isCorpEmail(email)) throw new Error("PRIVATE_EMAIL_BLOCKED");

  if (tmRow.last_invited_at) {
    const secondsAgo = (Date.now() - new Date(tmRow.last_invited_at).getTime()) / 1000;
    if (secondsAgo < 60) throw new Error(`RATE_LIMIT:${Math.ceil(60 - secondsAgo)}`);
  }

  // full_name rides along in user_metadata so the handle_new_user trigger populates
  // profiles.full_name on insert. We deliberately pass NO redirectTo: the invite
  // email template builds the link from GoTrue's own {{ .SiteURL }} (→
  // /auth/confirm), so a redirectTo here would be redundant and risks a stale
  // NEXT_PUBLIC_SITE_URL host that isn't on the redirect allow-list.
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    fullName ? { data: { full_name: fullName } } : undefined
  );
  if (inviteErr) throw inviteErr;
  const newUserId = invited.user?.id;
  if (!newUserId) throw new Error("INVITE_FAILED");

  // Force the first-login password change. This is the backstop to the explicit
  // /auth/confirm → update-password redirect: even if the invitee navigates away,
  // the (public) layout gate holds them at /login/update-password until they set a
  // password (updatePasswordAction clears this flag). app_metadata is service-role
  // only; GoTrue merges the key, leaving any other app_metadata intact.
  const { error: flagErr } = await admin.auth.admin.updateUserById(newUserId, {
    app_metadata: { force_password_change: true },
  });
  if (flagErr) throw flagErr;

  const profilePatch: Record<string, unknown> = {
    team_member_id: teamMemberId,
    updated_at: new Date().toISOString(),
  };
  if (input.role) profilePatch.role = input.role;
  const { error: profErr } = await admin.from("profiles").update(profilePatch).eq("id", newUserId);
  if (profErr) throw profErr;

  // Bidirectional link: team_members.auth_user_id ↔ profiles.team_member_id.
  const { error: linkErr } = await admin
    .from("team_members")
    .update({ auth_user_id: newUserId })
    .eq("id", teamMemberId);
  if (linkErr) throw linkErr;

  // Stamp the rate-limit timestamp (best-effort: the invite already went out, so
  // a stamp failure must not surface as an error — it only weakens the next
  // re-invite's rate-limit, which the GoTrue-side limit still backstops).
  await admin
    .from("team_members")
    .update({ last_invited_at: new Date().toISOString() })
    .eq("id", teamMemberId);

  await logActivity({
    userId: identity.userId,
    action: "invite_user",
    resourceType: "profile",
    resourceId: newUserId,
    metadata: { email, role: input.role ?? null, teamMemberId },
  });
  return { userId: newUserId };
}

// ── 7b. Bulk invite (sequential, single aggregate log) ───────────────────────

/**
 * Invite many team_members in one call. requireAdmin (inviteUser's own per-item
 * tier guard still applies, so a plain admin cannot mint admin/super_admin even
 * via bulk). Calls inviteUser sequentially with a 500ms gap between calls as
 * GoTrue rate-limit safety, and wraps each in try/catch so one failure never
 * aborts the batch — failures are collected into `failed` with their token reason.
 *
 * Logging: a SINGLE aggregate user_activity_log entry (counts + the failure
 * list), NOT one row per user — N per-user rows would swamp the log on a bulk run
 * and make it unreadable (Buhara decision, AP 2).
 */
export async function bulkInvite(teamMemberIds: string[]): Promise<BulkInviteResult> {
  const identity = await requireAdmin();

  const sent: string[] = [];
  const failed: Array<{ teamMemberId: string; reason: string }> = [];

  for (const id of teamMemberIds) {
    try {
      await inviteUser({ teamMemberId: id });
      sent.push(id);
    } catch (err) {
      failed.push({ teamMemberId: id, reason: err instanceof Error ? err.message : String(err) });
    }
    // GoTrue rate-limit safety between calls.
    await new Promise((r) => setTimeout(r, 500));
  }

  await logActivity({
    userId: identity.userId,
    action: "bulk_invite",
    resourceType: null,
    resourceId: null,
    metadata: { requested: teamMemberIds.length, sent: sent.length, failed: failed.length, failures: failed },
  });

  return { sent, failed };
}

// ── 7c. Create team_member (pre-seed; optional role default) ──────────────────

/**
 * Create a new team_members row (no auth account yet — that comes later via
 * inviteUser). This is the "pre-seed" step: an admin enters a new colleague's
 * name + email + department + position in the admin panel; "Invite now" is a
 * separate inviteUser call.
 *
 * Guard: requireAdmin for a "user"/"admin" intendedRole, requireSuperAdmin for a
 * "super_admin" intendedRole — auto-granting super_admin is structurally blocked,
 * mirroring inviteUser's tier guard.
 *
 * If intendedRole is not "user", this also UPSERTs into user_role_defaults so the
 * handle_new_user trigger (D-048 data-driven assignment) picks up the right role
 * when the auth account is later minted. That upsert is best-effort: the
 * team_member is the primary artifact — a defaults failure only means the role
 * must be set explicitly at invite time, so it is logged, not thrown.
 *
 * Validation is inline (same style as updateUserProfile): names trimmed + non-empty,
 * email trimmed/lowercased with a basic shape check, duplicate email pre-checked
 * for a friendlier error than the raw 23505.
 */
export async function createTeamMember(
  input: CreateTeamMemberInput
): Promise<{ teamMemberId: string }> {
  const identity =
    input.intendedRole === "super_admin" ? await requireSuperAdmin() : await requireAdmin();

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error("INVALID_NAME");

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");

  const initials = (firstName[0] + lastName[0]).toUpperCase();
  const admin = createAdminClient();

  // Pre-check duplicate for a friendly error (beats relying on the raw 23505).
  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) throw new Error("DUPLICATE_EMAIL");

  const { data: created, error: insErr } = await admin
    .from("team_members")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      department: input.department?.trim() || null,
      position: input.position?.trim() || null,
      initials,
    })
    .select("id")
    .single();
  if (insErr || !created) throw new Error("INSERT_FAILED");
  const teamMemberId = created.id as string;

  if (input.intendedRole && input.intendedRole !== "user") {
    const { error: rdErr } = await admin
      .from("user_role_defaults")
      .upsert({ email, role: input.intendedRole }, { onConflict: "email" });
    if (rdErr) {
      // Best-effort: the team_member exists; the role just has to be set at invite.
      console.error("[createTeamMember] user_role_defaults upsert failed:", rdErr.message);
    }
  }

  await logActivity({
    userId: identity.userId,
    action: "create_team_member",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { email, intendedRole: input.intendedRole ?? "user" },
  });

  return { teamMemberId };
}

// ── 7d. Self-service profile update (RLS write — the ONLY self-write) ─────────

/**
 * A signed-in user updates their OWN team_members row — the only self-write in
 * this module. Two independent gates:
 *  - ROW access: the RLS client (createClient(), NOT service-role) relies on the
 *    `team_self_update` policy from AP-1 migration 20260624111148, which only
 *    lets a user touch the row linked via profiles.team_member_id = auth.uid().
 *  - COLUMN access: enforced HERE, because that policy gates the row, not the
 *    columns. Whitelist = phone, private_phone, date_of_birth, show_birthday,
 *    status_line, about, location, company, website, github, linkedin, instagram.
 *    Everything else (first_name, last_name, position, department, email,
 *    sort_order, is_lead, joined_year, tools, tasks, auth_user_id,
 *    last_invited_at, initials, avatar_asset_id — avatars go through
 *    updateOwnAvatar) is admin-only and simply never written here. Role + email
 *    are deliberately NOT writable (role → escalation guard; email → auth-level).
 *
 * Throws NOT_AUTHENTICATED (anon), NOT_LINKED (no team_member link),
 * INVALID_DATE, PHONE_TOO_LONG, STATUS_TOO_LONG, VALUE_TOO_LONG, or UPDATE_FAILED
 * (the RLS write was rejected).
 */
export async function updateOwnProfile(patch: UpdateOwnProfilePatch): Promise<void> {
  const identity = await getIdentity();
  if (!identity) throw new Error("NOT_AUTHENTICATED");
  if (!identity.teamMemberId) throw new Error("NOT_LINKED");

  const update: Record<string, unknown> = {};

  // Phones (≤50).
  for (const [key, col] of [
    ["phone", "phone"],
    ["privatePhone", "private_phone"],
  ] as const) {
    if (patch[key] === undefined) continue;
    const v = patch[key]?.trim() || null;
    if (v && v.length > 50) throw new Error("PHONE_TOO_LONG");
    update[col] = v;
  }

  if (patch.dateOfBirth !== undefined) {
    if (patch.dateOfBirth === null || patch.dateOfBirth.trim() === "") {
      update.date_of_birth = null;
    } else {
      const trimmed = patch.dateOfBirth.trim();
      const d = new Date(trimmed);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || isNaN(d.getTime())) {
        throw new Error("INVALID_DATE");
      }
      update.date_of_birth = trimmed;
    }
  }

  if (patch.showBirthday !== undefined) update.show_birthday = !!patch.showBirthday;

  // Status line — hard 50-char cap (mirrors the DB CHECK).
  if (patch.statusLine !== undefined) {
    const v = patch.statusLine?.trim() || null;
    if (v && v.length > 50) throw new Error("STATUS_TOO_LONG");
    update.status_line = v;
  }

  // Free-text + links (column → max length).
  for (const [key, col, max] of [
    ["about", "about", 2000],
    ["location", "location", 120],
    ["company", "company", 120],
    ["website", "website", 300],
    ["github", "github", 300],
    ["linkedin", "linkedin", 300],
    ["instagram", "instagram", 300],
  ] as const) {
    if (patch[key] === undefined) continue;
    const v = patch[key]?.trim() || null;
    if (v && v.length > max) throw new Error("VALUE_TOO_LONG");
    update[col] = v;
  }

  if (Object.keys(update).length === 0) return; // nothing to do

  // RLS client → the team_self_update policy is the row gate (NOT service-role).
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update(update)
    .eq("id", identity.teamMemberId);
  if (error) throw new Error("UPDATE_FAILED");

  await logActivity({
    userId: identity.userId,
    action: "update_own_profile",
    resourceType: "team_member",
    resourceId: identity.teamMemberId,
    metadata: { fields: Object.keys(update) },
  });
}

/**
 * Read the signed-in user's own profile (all editable fields + read-only identity)
 * to prefill the account form. RLS: team_members is authenticated-readable, so the
 * user reads their own row. Returns null when the account has no linked
 * team_member yet (e.g. dev@) — the caller offers `ensureOwnTeamMember`.
 */
export async function getOwnProfile(): Promise<OwnProfile | null> {
  const identity = await getIdentity();
  if (!identity) throw new Error("NOT_AUTHENTICATED");
  if (!identity.teamMemberId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select(
      "first_name, last_name, position, department, phone, private_phone, date_of_birth, " +
        "show_birthday, status_line, about, location, company, website, github, linkedin, instagram, " +
        "avatar:assets!team_members_avatar_asset_id_fkey(public_url)"
    )
    .eq("id", identity.teamMemberId)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);

  return {
    teamMemberId: identity.teamMemberId,
    fullName:
      identity.fullName ?? composeFullName(null, { first_name: str(r.first_name), last_name: str(r.last_name), department: null, avatar_asset_id: null, avatar: null }),
    email: identity.email,
    role: identity.role,
    position: str(r.position),
    department: str(r.department),
    avatarUrl: one(r.avatar as AssetUrlRow | AssetUrlRow[] | null)?.public_url ?? null,
    phone: str(r.phone),
    privatePhone: str(r.private_phone),
    dateOfBirth: str(r.date_of_birth),
    showBirthday: r.show_birthday === true,
    statusLine: str(r.status_line),
    about: str(r.about),
    location: str(r.location),
    company: str(r.company),
    website: str(r.website),
    github: str(r.github),
    linkedin: str(r.linkedin),
    instagram: str(r.instagram),
  };
}

/**
 * Ensure the signed-in user has a linked team_members row, creating + linking a
 * minimal one if missing (the "every user gets a profile" guarantee — covers the
 * one deliberately-unlinked account, dev@). Service-role: minting + bidirectional
 * linking is a privileged op, but it only ever acts on the caller's own identity.
 * Idempotent — returns the existing team_member id when already linked.
 */
export async function ensureOwnTeamMember(): Promise<string> {
  const identity = await getIdentity();
  if (!identity) throw new Error("NOT_AUTHENTICATED");
  if (identity.teamMemberId) return identity.teamMemberId;

  const admin = createAdminClient();
  const base = identity.fullName?.trim() || identity.email?.split("@")[0] || "User";
  const parts = base.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "User";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? firstName[1] ?? "")).toUpperCase() || "U";

  const { data: created, error } = await admin
    .from("team_members")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: identity.email,
      initials,
      auth_user_id: identity.userId,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error("PROVISION_FAILED");
  const teamMemberId = created.id as string;

  const { error: linkErr } = await admin
    .from("profiles")
    .update({ team_member_id: teamMemberId, updated_at: new Date().toISOString() })
    .eq("id", identity.userId);
  if (linkErr) throw linkErr;

  await logActivity({
    userId: identity.userId,
    action: "provision_own_team_member",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: {},
  });
  return teamMemberId;
}

// ── 8. Upload avatar (service-role storage + asset upsert) ───────────────────

/**
 * Core avatar write (no auth — callers gate first). Validates against the avatars
 * bucket config (png/jpeg/webp, ≤ 2 MB — migration 0038), stores at the canonical
 * path `<team_member_id>/avatar.<ext>`, upserts the matching `assets` row (unique
 * on (bucket, storage_path)), and repoints team_members.avatar_asset_id. Throws
 * INVALID_FILE_TYPE / FILE_TOO_LARGE on a bad file. Shared by the admin upload and
 * the self-service path so both stay byte-identical.
 */
async function putAvatar(teamMemberId: string, file: File): Promise<{ assetId: string; url: string }> {
  const ext = AVATAR_MIME_TO_EXT[file.type];
  if (!ext) throw new Error("INVALID_FILE_TYPE");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("FILE_TOO_LARGE");

  const admin = createAdminClient();
  const path = `${teamMemberId}/avatar.${ext}`;
  const { error: upErr } = await admin.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATARS_BUCKET).getPublicUrl(path);

  const { data: asset, error: assetErr } = await admin
    .from("assets")
    .upsert(
      {
        bucket: AVATARS_BUCKET,
        storage_path: path,
        public_url: publicUrl,
        filename: `avatar.${ext}`,
        mime_type: file.type,
        size_bytes: file.size,
      },
      { onConflict: "bucket,storage_path" }
    )
    .select("id")
    .single();
  if (assetErr) throw assetErr;
  const assetId = asset.id as string;

  const { error: linkErr } = await admin
    .from("team_members")
    .update({ avatar_asset_id: assetId })
    .eq("id", teamMemberId);
  if (linkErr) throw linkErr;

  return { assetId, url: publicUrl };
}

/**
 * Admin uploads another user's avatar. requireAdmin; resolves the target's
 * team_member from their profile (NO_TEAM_MEMBER if unlinked). Returns the asset
 * id + its public url (the bucket is public).
 */
export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<{ assetId: string; url: string }> {
  const identity = await requireAdmin();

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("team_member_id")
    .eq("id", userId)
    .maybeSingle();
  const teamMemberId = (prof as { team_member_id: string | null } | null)?.team_member_id ?? null;
  if (!teamMemberId) throw new Error("NO_TEAM_MEMBER");

  const result = await putAvatar(teamMemberId, file);
  await logActivity({
    userId: identity.userId,
    action: "upload_avatar",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { targetUserId: userId, assetId: result.assetId },
  });
  return result;
}

/**
 * Self-service avatar: a signed-in user replaces their OWN avatar. Ownership is
 * enforced by deriving the team_member from the session (NEVER a client-supplied
 * id), so a user can only ever touch their own avatar even though the storage
 * write runs as service-role. Auto-provisions a team_member if the account has
 * none yet (mirrors getOwnProfile's guarantee).
 */
export async function updateOwnAvatar(file: File): Promise<{ url: string }> {
  const identity = await getIdentity();
  if (!identity) throw new Error("NOT_AUTHENTICATED");
  const teamMemberId = identity.teamMemberId ?? (await ensureOwnTeamMember());

  const result = await putAvatar(teamMemberId, file);
  await logActivity({
    userId: identity.userId,
    action: "update_own_avatar",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { assetId: result.assetId },
  });
  return { url: result.url };
}

// ── 9. Deactivate (service-role ban) ─────────────────────────────────────────

/**
 * Soft-deactivate a user by banning the auth account for ~100 years (an effective
 * indefinite ban — a banned user cannot sign in). requireSuperAdmin plus a
 * code-level self-lock so a super_admin can't lock themselves out. The profile and
 * its data are untouched; reactivation (ban_duration "none") is a later addition.
 */
export async function deactivateUser(userId: string): Promise<void> {
  const identity = await requireSuperAdmin();
  if (userId === identity.userId) throw new Error("SELF_LOCK");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: DEACTIVATE_BAN_DURATION,
  });
  if (error) throw error;

  await logActivity({
    userId: identity.userId,
    action: "deactivate_user",
    resourceType: "profile",
    resourceId: userId,
    metadata: { targetUserId: userId, banDuration: DEACTIVATE_BAN_DURATION },
  });
}

// ── 9a2. Send password reset (admin-trigger, GoTrue recovery email) ──────────

/**
 * Admin-trigger "send password reset" — emails the user a GoTrue recovery link.
 * Keyed on the TEAM_MEMBER id (panel's natural key); reads auth_user_id + email
 * directly from team_members (no profiles hop). Reuses the SAME primitive
 * (resetPasswordForEmail) as the public forgot-password path (login/actions.ts),
 * so it needs ZERO new email-template/redirect infra: the Recovery template builds
 * the link from {{ .SiteURL }} → /auth/confirm?type=recovery → update-password
 * (the single password sink, which clears force_password_change on completion). NO
 * redirectTo (a stale NEXT_PUBLIC_SITE_URL host risks falling off GoTrue's
 * uri_allow_list — same reasoning as inviteUser).
 *
 * NOT inviteUserByEmail (mints a NEW auth user — wrong for an active account),
 * NOT generateLink (returns a link the app must email itself). A plain reset does
 * NOT set force_password_change (the recovery link itself authorizes the change).
 *
 * requireSuperAdmin — a credential-adjacent action; matches the panel's gate.
 * A person never invited has no auth user → NOT_INVITED (the UI offers Invite
 * instead). Mirrors inviteUser's email guards (NO_EMAIL / PRIVATE_EMAIL_BLOCKED).
 * Rate-limit relies on GoTrue's built-in recovery limit (as the public path does).
 *
 * Throws NO_TEAM_MEMBER, NOT_INVITED, NO_EMAIL, PRIVATE_EMAIL_BLOCKED, RESET_FAILED.
 */
export async function sendPasswordReset(teamMemberId: string): Promise<void> {
  const identity = await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: tm } = await admin
    .from("team_members")
    .select("auth_user_id, email")
    .eq("id", teamMemberId)
    .maybeSingle();
  const tmRow = tm as { auth_user_id: string | null; email: string | null } | null;
  if (!tmRow) throw new Error("NO_TEAM_MEMBER");
  if (!tmRow.auth_user_id) throw new Error("NOT_INVITED"); // never invited → invite, not reset
  if (!tmRow.email) throw new Error("NO_EMAIL");

  const email = tmRow.email.trim().toLowerCase();
  if (!isCorpEmail(email)) throw new Error("PRIVATE_EMAIL_BLOCKED");

  // Same call the public path makes — anon auth surface, NO redirectTo.
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error("RESET_FAILED");

  await logActivity({
    userId: identity.userId,
    action: "send_password_reset",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { teamMemberId, email },
  });
}

// ── 9a3. Change login email (auth.users ⇄ profiles ⇄ team_members) ───────────

/**
 * Change a user's LOGIN email. Email is the GoTrue identity (auth.users.email)
 * denormalized into profiles.email AND team_members.email — three places that must
 * move together. requireSuperAdmin (email is credential-adjacent identity).
 *
 * Order (fail-closed, can't span a single txn across GoTrue + Postgres):
 *  1. requireSuperAdmin + validate (format, corp-email) + resolve the target.
 *  2. PEER-SUPER_ADMIN GUARD (review F4/F5): changing ANOTHER super_admin's email is
 *     an account-takeover vector (set a peer's email to an attacker address, then
 *     trigger a reset → link lands in the attacker's inbox). So a super_admin target
 *     may only be changed by themselves → CANNOT_MANAGE_PEER_SUPERADMIN.
 *  3. AUDIT BEFORE the writes (review M1): a partial apply must always leave a trail.
 *  4. GoTrue first (source of truth). email_confirm:true skips the double-confirm
 *     loop for an admin-forced change — the UI requires a typed re-entry to guard
 *     the fat-finger risk this opens (review M3). On failure → EMAIL_CHANGE_FAILED,
 *     before any DB write.
 *  5. The change_user_email RPC (migration 20260628130002) mirrors profiles.email +
 *     team_members.email + the user_role_defaults key rename in ONE transaction.
 *
 * Throws NO_TEAM_MEMBER, NOT_INVITED (no auth user — invite, don't change),
 * NO_EMAIL, INVALID_EMAIL, PRIVATE_EMAIL_BLOCKED, CANNOT_MANAGE_PEER_SUPERADMIN,
 * EMAIL_CHANGE_FAILED (GoTrue), UPDATE_FAILED (the DB mirror RPC).
 */
export async function changeUserEmail(teamMemberId: string, newEmail: string): Promise<void> {
  const identity = await requireSuperAdmin();
  const admin = createAdminClient();

  const raw = (newEmail ?? "").trim().toLowerCase();
  if (!raw) throw new Error("NO_EMAIL");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) throw new Error("INVALID_EMAIL");
  if (!isCorpEmail(raw)) throw new Error("PRIVATE_EMAIL_BLOCKED");

  // Resolve target: auth user + current email + the linked profile's role (peer guard).
  const { data: tm } = await admin
    .from("team_members")
    .select("auth_user_id, email, profile:profiles!profiles_team_member_id_fkey(id, role)")
    .eq("id", teamMemberId)
    .maybeSingle();
  const tmRow = tm as {
    auth_user_id: string | null;
    email: string | null;
    profile: ProfileRel | ProfileRel[] | null;
  } | null;
  if (!tmRow) throw new Error("NO_TEAM_MEMBER");
  if (!tmRow.auth_user_id) throw new Error("NOT_INVITED");

  // F4/F5: a peer super_admin's email may only be changed by themselves.
  const prof = one(tmRow.profile);
  if (prof?.role === "super_admin" && prof.id !== identity.userId) {
    throw new Error("CANNOT_MANAGE_PEER_SUPERADMIN");
  }

  // M1: audit the attempt BEFORE the writes so a half-apply is always recorded.
  await logActivity({
    userId: identity.userId,
    action: "change_email",
    resourceType: "team_member",
    resourceId: teamMemberId,
    metadata: { teamMemberId, old: tmRow.email, new: raw },
  });

  // GoTrue first (identity source of truth). email_confirm bypasses the ownership
  // re-confirm loop for an admin-forced change (the UI's typed re-entry is the guard).
  const { error: authErr } = await admin.auth.admin.updateUserById(tmRow.auth_user_id, {
    email: raw,
    email_confirm: true,
  });
  if (authErr) throw new Error("EMAIL_CHANGE_FAILED");

  // DB mirrors in ONE transaction (profiles + team_members + user_role_defaults).
  const { error: rpcErr } = await admin.rpc("change_user_email", {
    p_team_member_id: teamMemberId,
    p_new_email: raw,
  });
  if (rpcErr) throw new Error("UPDATE_FAILED");
}

// ── 9b. Export audit (super-admin, log-only) ─────────────────────────────────

/**
 * Record a "users exported to CSV" action in the activity log. The CSV is built +
 * downloaded entirely client-side (admin-users-csv.ts); this server function is
 * the audit trail only. requireSuperAdmin (the export lives in the super-admin
 * panel). A bulk export has no single subject, so resource_type/resource_id stay
 * null and the selection size + scope go in metadata. Reuses logActivity (the
 * canonical, service-role, never-throws logger) so a log failure never surfaces
 * as an export failure — the file is already in the user's hands.
 */
export async function exportUsersLog(params: {
  count: number;
  scope: "selection" | "filtered";
}): Promise<void> {
  const identity = await requireSuperAdmin();
  await logActivity({
    userId: identity.userId,
    action: "export_users",
    resourceType: null,
    resourceId: null,
    metadata: { count: params.count, scope: params.scope },
  });
}

// ── 10. Activity logger (service-role insert) ────────────────────────────────

/**
 * Append a row to user_activity_log. Writes are service-role ONLY by design
 * (migration 0036: no INSERT policy for authenticated — the log must be
 * unforgeable). Called internally by the mutations above and externally by the
 * Stage-9 hooks in documents-library/actions.ts + presentation-hub/actions.ts.
 *
 * `userId` records the ACTOR (who did it); the subject/target goes in
 * resourceId/metadata. This is a synchronous helper but never throws — a logging
 * failure must not bubble up and fail the user-facing action that triggered it,
 * so all errors are caught and logged to the server console.
 *
 * NOTE: this does NOT gate on a role; the caller is responsible for having already
 * authorized the action (every internal caller has run requireAdmin/SuperAdmin).
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("user_activity_log").insert({
      user_id: input.userId,
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) console.error("[logActivity] insert failed:", error.message);
  } catch (e) {
    console.error("[logActivity] unexpected error:", e);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Team-member directory (admin panel — Stage 7A)
//
// Distinct from getAllUsers() above, which lists `profiles` (auth users). The
// admin panel needs the whole 63-person `team_members` directory regardless of
// whether each person has been invited yet, with their login state overlaid.
// So this reads `team_members` as the base and LEFT-JOINs the (optional) profile
// for role + the (optional) avatar asset. getAllUsers() is preserved untouched —
// Stages 7B/7C use it for the auth-user/orphan side of the panel.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Login state of a team member, derived from profile presence + last sign-in:
 * - "active"      → has a profile AND has signed in at least once
 * - "invited"     → has a profile but never signed in (invite pending)
 * - "not_invited" → no auth profile linked yet
 */
export type LoginStatus = "active" | "invited" | "not_invited";

export interface TeamMemberListItem {
  teamMemberId: string;
  firstName: string;
  lastName: string;
  /** Salutation / honorific (team_members.title), or null. Prefixed to the display name. */
  title: string | null;
  position: string | null;
  department: string | null;
  /** Precomputed initials (e.g. "BD"); NOT NULL in team_members. */
  initials: string;
  email: string | null;
  phone: string | null;
  /** avatars-bucket PUBLIC url (safe in a DTO), or null → render initials. */
  avatarUrl: string | null;
  /** Linked auth profile id (= auth.users.id), or null if not invited yet. */
  profileId: string | null;
  /** Role from the linked profile, or null if not invited yet. */
  role: Role | null;
  /** Planned role from user_role_defaults (email-keyed lookup), or null if no
   *  default row exists. The detail modal surfaces it only for not-yet-invited
   *  people with a non-"user" default ("Geplante Rolle … aktiv nach Einladung"),
   *  because the role only materializes on the profile once the person is invited. */
  intendedRole: Role | null;
  lastSignInAt: string | null;
  /** team_members.last_invited_at — last time an invite was sent, or null. Drives
   *  the "zuletzt eingeladen vor X" hint + the resend rate-limit display. */
  lastInvitedAt: string | null;
  loginStatus: LoginStatus;
  // Directory detail (Stage 7B modal) — carried in the list payload (≤63 rows,
  // negligible size) so opening the modal needs no extra round-trip.
  /** Tool tags (e.g. ["Figma", "Webflow"]); [] if none. */
  tools: string[];
  /** Free-text responsibilities, or null. */
  tasks: string | null;
  /** Tenure year (e.g. 2018), or null. */
  joinedYear: number | null;
  isLead: boolean;
  /** team_members.created_at — when the directory record was created (NOT NULL).
   *  Backs the optional "Erstellt" column (AP 3 Phase 4). */
  createdAt: string;
}

/** Filters for the team-member directory. All optional; combined with AND. */
export interface TeamMemberFilters {
  department?: string;
  /** Role of the linked profile; pass `null` to match "no profile yet". */
  role?: Role | null;
  /** true = has a profile, false = has none. */
  hasLogin?: boolean;
  /** Free-text over first + last name + email (case-insensitive substring). */
  q?: string;
}

type ProfileRel = { id: string; role: string };
type TeamMemberAdminRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  position: string | null;
  department: string | null;
  initials: string;
  email: string | null;
  phone: string | null;
  joined_year: number | null;
  is_lead: boolean;
  tools: string[] | null;
  tasks: string | null;
  last_invited_at: string | null;
  created_at: string;
  avatar_asset_id: string | null;
  // Avatar + profile use explicit FK hints so PostgREST resolves the embeds
  // deterministically (avatar matches pages.ts; profile FK from migration 0034).
  avatar: AssetUrlRow | AssetUrlRow[] | null;
  profile: ProfileRel | ProfileRel[] | null;
};

const TEAM_MEMBER_ADMIN_SELECT =
  "id, first_name, last_name, title, position, department, initials, email, phone, " +
  "joined_year, is_lead, tools, tasks, last_invited_at, created_at, avatar_asset_id, " +
  "avatar:assets!team_members_avatar_asset_id_fkey(public_url), " +
  "profile:profiles!profiles_team_member_id_fkey(id, role)";

function mapTeamMember(
  r0: unknown,
  signInMap: Map<string, string | null>,
  roleDefaults: Map<string, Role>
): TeamMemberListItem {
  const r = r0 as TeamMemberAdminRow;
  const profile = one(r.profile);
  const profileId = profile?.id ?? null;
  const role = (profile?.role as Role | undefined) ?? null;
  const lastSignInAt = profileId ? signInMap.get(profileId) ?? null : null;
  const loginStatus: LoginStatus = !profileId ? "not_invited" : lastSignInAt ? "active" : "invited";
  const emailKey = r.email?.trim().toLowerCase() ?? null;
  const intendedRole = emailKey ? roleDefaults.get(emailKey) ?? null : null;
  return {
    teamMemberId: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    title: r.title,
    position: r.position,
    department: r.department,
    initials: r.initials,
    email: r.email,
    phone: r.phone,
    avatarUrl: one(r.avatar)?.public_url ?? null,
    profileId,
    role,
    intendedRole,
    lastSignInAt,
    lastInvitedAt: r.last_invited_at,
    loginStatus,
    tools: r.tools ?? [],
    tasks: r.tasks,
    joinedYear: r.joined_year,
    isLead: r.is_lead,
    createdAt: r.created_at,
  };
}

/**
 * The full team-member directory for the admin panel, sorted alphabetically by
 * last name then first name (NOT sort_order). RLS-scoped: team_members is
 * authenticated-readable and the embedded profile follows the profiles SELECT
 * policy (an admin/super_admin sees every linked profile). last_sign_in_at is
 * enriched from auth.users via the same service-role batch as getAllUsers — but
 * only when at least one member actually has a linked profile (today: none).
 *
 * Filters are applied in memory: the directory is bounded by company headcount
 * (~63), so one read + in-memory filtering is simplest and keeps totalCount
 * exact. The Stage 7A page calls this without filters (the client panel filters
 * the full set); the filters here are for future server-side use.
 */
export async function getAllTeamMembers(
  filters?: TeamMemberFilters
): Promise<{ teamMembers: TeamMemberListItem[]; totalCount: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select(TEAM_MEMBER_ADMIN_SELECT)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(MAX_USER_FETCH);
  const rows = (data ?? []) as unknown[];

  // Enrich last_sign_in_at only for members with a linked profile — collect those
  // ids and do one bounded RPC (O4); skip entirely when none are linked.
  const profileIds = rows
    .map((r) => one((r as TeamMemberAdminRow).profile)?.id)
    .filter((id): id is string => !!id);
  const signInMap = profileIds.length
    ? await fetchLastSignInMap(profileIds)
    : new Map<string, string | null>();

  // Planned-role hint (AP 3 Phase 7): email-keyed lookup into user_role_defaults.
  // RLS-scoped — its policy is USING is_super_admin() (migration 0030), which is
  // exactly who reaches this panel; any other caller gets an empty map (and thus
  // intendedRole = null everywhere), so this never leaks the assignment table.
  const { data: rdData } = await supabase.from("user_role_defaults").select("email, role");
  const roleDefaults = new Map<string, Role>();
  for (const rd of (rdData ?? []) as { email: string; role: string }[]) {
    if (rd.email) roleDefaults.set(rd.email.trim().toLowerCase(), rd.role as Role);
  }

  let items = rows.map((r) => mapTeamMember(r, signInMap, roleDefaults));

  if (filters?.department) items = items.filter((u) => u.department === filters.department);
  if (filters?.role !== undefined) {
    items = items.filter((u) => (filters.role === null ? u.role === null : u.role === filters.role));
  }
  if (filters?.hasLogin === true) items = items.filter((u) => u.profileId !== null);
  else if (filters?.hasLogin === false) items = items.filter((u) => u.profileId === null);
  if (filters?.q) {
    const q = filters.q.trim().toLowerCase();
    if (q) {
      items = items.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email ?? ""}`.toLowerCase().includes(q)
      );
    }
  }

  return { teamMembers: items, totalCount: items.length };
}

// ── 10b. Single team_member as a list DTO (post-edit splice) ─────────────────

/**
 * One team_member mapped to the list DTO. Used by adminUpdateUserAction to return
 * the freshly-written row so the panel can splice it in place (no full 63-row
 * refetch — finding from the caching pass). RLS-scoped read (same visibility as
 * getAllTeamMembers) + the single-row sign-in enrichment via the service-role RPC.
 * Returns null if the row is gone.
 */
export async function getTeamMemberById(teamMemberId: string): Promise<TeamMemberListItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select(TEAM_MEMBER_ADMIN_SELECT)
    .eq("id", teamMemberId)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as TeamMemberAdminRow;
  const profileId = one(row.profile)?.id ?? null;
  const signInMap = profileId
    ? await fetchLastSignInMap([profileId])
    : new Map<string, string | null>();

  const { data: rdData } = await supabase.from("user_role_defaults").select("email, role");
  const roleDefaults = new Map<string, Role>();
  for (const rd of (rdData ?? []) as { email: string; role: string }[]) {
    if (rd.email) roleDefaults.set(rd.email.trim().toLowerCase(), rd.role as Role);
  }

  return mapTeamMember(row, signInMap, roleDefaults);
}

// ── 11. AI-chat history for one user (super-admin audit — RLS read) ──────────

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  /** Verbatim text — role='user' is the question the user typed. */
  content: string;
  /** Raw retrieved_chunks jsonb (RagSource[] shape); mapped to AiSource client-side. */
  retrievedChunks: unknown[];
  /** Persisted 👍/👎 on the assistant message (null = none). */
  userFeedback: "helpful" | "not_helpful" | null;
  createdAt: string;
}

export interface ChatSessionItem {
  sessionId: string;
  title: string | null;
  createdAt: string;
  messages: ChatMessageItem[];
}

/**
 * One user's AI-chat history (sessions + their user/assistant messages), newest
 * session first. RLS-scoped: the ai_chat_sessions / ai_chat_messages SELECT
 * policies (migration 20260623060259) read `... OR is_super_admin()`, so a
 * super_admin reading through the request-scoped createClient() (NOT service-role)
 * sees every user's chat — and a non-super-admin physically cannot. That makes
 * "only super_admin sees AI-chat content" a DB-enforced guarantee, not just a UI
 * gate. `userId` is the auth/profile id (= ai_chat_sessions.user_id); messages
 * join via session_id (the message row has no user_id column).
 */
export async function getUserChatHistory(
  userId: string,
  opts?: { sessionLimit?: number }
): Promise<ChatSessionItem[]> {
  const supabase = await createClient();
  const sessionLimit = clampLimit(opts?.sessionLimit, 25, 100);

  const { data: sessions } = await supabase
    .from("ai_chat_sessions")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(sessionLimit);
  const sRows = (sessions ?? []) as { id: string; title: string | null; created_at: string }[];
  if (sRows.length === 0) return [];

  const ids = sRows.map((s) => s.id);
  const { data: messages } = await supabase
    .from("ai_chat_messages")
    .select("id, session_id, role, content, retrieved_chunks, user_feedback, created_at")
    .in("session_id", ids)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  const mRows = (messages ?? []) as {
    id: number;
    session_id: string;
    role: string;
    content: string;
    retrieved_chunks: unknown[] | null;
    user_feedback: "helpful" | "not_helpful" | null;
    created_at: string;
  }[];

  const bySession = new Map<string, ChatMessageItem[]>();
  for (const m of mRows) {
    const arr = bySession.get(m.session_id) ?? [];
    arr.push({
      id: String(m.id),
      role: m.role as ChatMessageItem["role"],
      content: m.content,
      retrievedChunks: (m.retrieved_chunks ?? []) as unknown[],
      userFeedback: (m.user_feedback ?? null) as ChatMessageItem["userFeedback"],
      createdAt: m.created_at,
    });
    bySession.set(m.session_id, arr);
  }

  return sRows.map((s) => ({
    sessionId: s.id,
    title: s.title,
    createdAt: s.created_at,
    messages: bySession.get(s.id) ?? [],
  }));
}

// ── 9. Brand assignments for one team member (RLS read) ──────────────────────

/**
 * Brand assignments for a single team_member, primary first then alphabetical.
 *
 * Keyed on the team_member id, so it works for EVERY team_member — including the
 * ~61 with no auth account yet — unlike getUserById(), which is profiles-based and
 * returns null for not-yet-invited people. RLS: team_member_brands + brands are
 * authenticated-readable; the requireAdmin gate keeps "view someone else's brand
 * assignments" an admin-only capability (used by the per-user permissions tab).
 *
 * Errors: "NOT_AUTHENTICATED" / "NOT_AUTHORIZED" (requireAdmin).
 */
export async function getTeamMemberBrands(teamMemberId: string): Promise<BrandRef[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_member_brands")
    .select(
      "is_primary, brands(id, slug, name, short_name, logo:assets!brands_logo_asset_id_fkey(public_url))"
    )
    .eq("team_member_id", teamMemberId);
  return mapBrandRefs((data ?? []) as unknown as TmBrandRow[]);
}

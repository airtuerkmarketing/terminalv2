import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Four-role model (D-111, migration 20260701000000). Replaces the prior
 * three-tier model: the `admin` tier was drained (Approach 3) and split into two
 * named writer roles, then removed from the profiles.role CHECK. is_admin()
 * DB-side now collapses to super_admin only.
 *
 * super_admin: full access. department_admin / ai_admin: writer roles scoped to
 * their own content (Documents Library ownership; ai_admin additionally runs the
 * AI knowledge/correction workflow). user: read-only.
 */
export type Role = "super_admin" | "department_admin" | "ai_admin" | "user";

/**
 * Identity of the currently signed-in user.
 *
 * Source: the `profiles` row with `team_members` embedded via the bridge FK
 * profiles.team_member_id → team_members.id (Migration 0034). The
 * team_member-derived fields (teamMemberId, firstName, lastName, department,
 * avatarAssetId) are nullable because not every auth user has a linked
 * team_member (e.g. dev@airtuerk.de).
 *
 * NOTE: deliberately NOT read through the profiles_v view — that view is
 * SECURITY INVOKER over auth.users, which the authenticated/RLS client cannot
 * read ("permission denied for table users"). profiles_v is reserved for
 * service-role reads (Stage 7 admin panel).
 */
export interface Identity {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  /** DB is_admin() parity — admin tier drained (D-111), so this is super_admin only. */
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDeptAdmin: boolean;
  isAiAdmin: boolean;
  // Stammdaten via the team_members embed (bridge FK from Migration 0034)
  teamMemberId: string | null;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  avatarAssetId: string | null;
  // Block 2: true when auth.users.raw_app_meta_data.force_password_change is set
  // (seeded for not-yet-signed-in accounts). Gated in (public)/layout.tsx.
  forcePasswordChange: boolean;
}

/**
 * Returns the Identity of the currently signed-in user, or null if anon.
 * Wrapped in React cache() so multiple calls per request share one DB read.
 *
 * Reads the `profiles` row with `team_members` embedded via the FK, so the
 * returned Identity carries team_member stammdaten in addition to auth
 * fields — RLS-safe (no auth.users access required).
 */
export const getIdentity = cache(async (): Promise<Identity | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, email, full_name, team_member_id, team_members(first_name, last_name, department, avatar_asset_id)"
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // team_members is embedded via profiles.team_member_id → team_members.id (to-one;
  // the FK column is unique per Migration 0034). PostgREST returns a single object
  // (or null) at runtime, but supabase-js types the embed as an array without a
  // typed schema — normalize via unknown + Array.isArray so both shapes are safe.
  const tmRel = profile.team_members as unknown;
  const tm = (Array.isArray(tmRel) ? tmRel[0] : tmRel) as {
    first_name: string | null;
    last_name: string | null;
    department: string | null;
    avatar_asset_id: string | null;
  } | null;

  const role = profile.role as Role;
  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.full_name,
    role,
    isAdmin: role === "super_admin",
    isSuperAdmin: role === "super_admin",
    isDeptAdmin: role === "department_admin",
    isAiAdmin: role === "ai_admin",
    teamMemberId: profile.team_member_id,
    firstName: tm?.first_name ?? null,
    lastName: tm?.last_name ?? null,
    department: tm?.department ?? null,
    avatarAssetId: tm?.avatar_asset_id ?? null,
    forcePasswordChange: user.app_metadata?.force_password_change === true,
  };
});

/**
 * Throws unless the viewer is an admin (or super_admin). Returns the Identity
 * for downstream use.
 *
 * Error strings "NOT_AUTHENTICATED" / "NOT_AUTHORIZED" are matched verbatim by
 * the server actions' error mappers (documents-library + presentation-hub
 * actions.ts) — keep them to preserve backward compatibility.
 */
export async function requireAdmin(): Promise<Identity> {
  const id = await getIdentity();
  if (!id) throw new Error("NOT_AUTHENTICATED");
  if (!id.isAdmin) throw new Error("NOT_AUTHORIZED");
  return id;
}

/**
 * Throws unless the viewer is a super_admin (folder delete / visibility /
 * roles). Returns the Identity for downstream use. Error strings matched by
 * the server actions' error mappers — keep them.
 */
export async function requireSuperAdmin(): Promise<Identity> {
  const id = await getIdentity();
  if (!id) throw new Error("NOT_AUTHENTICATED");
  if (!id.isSuperAdmin) throw new Error("NOT_AUTHORIZED");
  return id;
}

/**
 * Guard for Documents-Library writer actions (D-111, owner-based model).
 *
 * super_admin: always allowed. department_admin / ai_admin: allowed as writer
 * roles; when `folderId` is given, additionally required to OWN that folder
 * (created_by = them). Everyone else: NOT_AUTHORIZED. Ownership is read through
 * the service-role client because the write actions themselves run service-role
 * (the require* guard is the real boundary — RLS is a backstop).
 *
 * Error strings "NOT_AUTHENTICATED" / "NOT_AUTHORIZED" are matched verbatim by
 * the actions' error mappers — keep them.
 */
export async function requireLibraryWriter(folderId?: string): Promise<Identity> {
  const id = await getIdentity();
  if (!id) throw new Error("NOT_AUTHENTICATED");
  if (id.isSuperAdmin) return id;
  if (!id.isDeptAdmin && !id.isAiAdmin) throw new Error("NOT_AUTHORIZED");

  if (folderId) {
    const admin = createAdminClient();
    const { data: folder } = await admin
      .from("document_folders")
      .select("created_by")
      .eq("id", folderId)
      .single();
    if (!folder || folder.created_by !== id.userId) throw new Error("NOT_AUTHORIZED");
  }
  return id;
}

/**
 * Guard for the AI-knowledge / correction workflow (D-111 Q3). super_admin OR
 * ai_admin allowed; everyone else NOT_AUTHORIZED. Taxonomy writes stay
 * super_admin-only and keep using requireSuperAdmin (not this guard).
 */
export async function requireAiAdminOrSuper(): Promise<Identity> {
  const id = await getIdentity();
  if (!id) throw new Error("NOT_AUTHENTICATED");
  if (id.isSuperAdmin || id.isAiAdmin) return id;
  throw new Error("NOT_AUTHORIZED");
}

/**
 * Same-origin redirect guard for auth flows (login `?next`, invite/recovery
 * confirm). Returns the value only if it is a same-origin, path-RELATIVE URL;
 * returns null otherwise so callers can fall back to "/".
 *
 * Rejects: absolute URLs (`https://…`), protocol-relative (`//host`), and
 * backslash variants (browsers may fold `\` → `/`, so `/\evil.com` would become
 * `//evil.com`). Single source of truth — used by src/app/login/actions.ts,
 * src/app/login/page.tsx and src/app/auth/confirm/route.ts.
 */
export function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  return raw;
}

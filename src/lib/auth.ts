import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Three-tier role model (Migration 0030).
 * super_admin: full access; admin: tier-bounded write; user: read-only.
 */
export type Role = "super_admin" | "admin" | "user";

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
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
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

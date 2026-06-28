-- ─────────────────────────────────────────────────────────────────────────────
-- change_user_email(p_team_member_id, p_new_email) — atomic 3-way email mirror.
--
-- Email is the GoTrue login identity (auth.users.email) denormalized into BOTH
-- public.profiles.email AND public.team_members.email. An admin email change must
-- keep all three in sync. GoTrue is mutated FIRST by the caller (it can't be part
-- of a Postgres transaction and is the source of truth); this RPC then syncs the
-- public tables in ONE transaction so they can never half-apply (review finding C1).
--
-- The three DB writes, atomic:
--   1. public.team_members.email  (the row's updated_at trigger stamps it)
--   2. public.profiles.email      (no updated_at trigger here → manual now())
--   3. public.user_role_defaults  — RENAME the email PK in place (review finding H2:
--      the old upsert-new + delete-old was a non-atomic two-step that could orphan
--      or duplicate the role default). user_role_defaults.email is the PK and is
--      referenced by nothing, so an in-place UPDATE is safe. A stale default already
--      sitting on the NEW address (a pre-invite seed for an address now being taken)
--      is cleared first so the rename can't trip the PK.
--
-- SECURITY DEFINER (owner = postgres) so it writes regardless of the caller's RLS;
-- the caller (changeUserEmail in src/lib/users.ts) is the gate: requireSuperAdmin
-- + a peer-super_admin guard run BEFORE this is invoked. EXECUTE is granted to
-- service_role ONLY (the admin client) and revoked from anon/authenticated/public.
-- SET search_path per house SECDEF style; all tables fully qualified. Idempotent.
--
-- NOTE: validation (format, corp-email, NOT_INVITED, peer-super_admin) lives in the
-- TS caller; this RPC trusts its inputs and only enforces row existence.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.change_user_email(p_team_member_id uuid, p_new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new text := lower(btrim(p_new_email));
  v_old text;
BEGIN
  IF v_new IS NULL OR v_new = '' THEN
    RAISE EXCEPTION 'NO_EMAIL' USING ERRCODE = '22023';
  END IF;

  SELECT lower(btrim(email)) INTO v_old
  FROM public.team_members
  WHERE id = p_team_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_TEAM_MEMBER' USING ERRCODE = 'P0002';
  END IF;

  -- 1. team_members (updated_at trigger stamps).
  UPDATE public.team_members SET email = v_new WHERE id = p_team_member_id;

  -- 2. profiles (no updated_at trigger → manual stamp); keyed via the bridge FK.
  UPDATE public.profiles
    SET email = v_new, updated_at = now()
    WHERE team_member_id = p_team_member_id;

  -- 3. user_role_defaults: atomic in-place rename of the email PK (H2 fix). Clear
  --    any stale default already on the new address first so the rename can't
  --    collide with the PK. Only runs when the old email actually differs.
  IF v_old IS NOT NULL AND v_old <> v_new THEN
    DELETE FROM public.user_role_defaults WHERE email = v_new;
    UPDATE public.user_role_defaults SET email = v_new WHERE email = v_old;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.change_user_email(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.change_user_email(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.change_user_email(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_email(uuid, text) TO service_role;

-- Registry note (apply time, per CLAUDE.md): register version 20260628130002 in
-- supabase_migrations.schema_migrations (matching version) via execute_sql + an
-- explicit registry row (NOT apply_migration, which auto-timestamps). Verify ledger
-- parity by hashing the sorted version set. Prod write needs explicit owner sign-off.

-- ============================================================================
-- terminalv2 — User Management V1, Teil 1
-- Migration: 20260624110735_user_mgmt_last_invited_and_self_update.sql
-- ============================================================================
-- Description:
--   1) Adds team_members.last_invited_at for invitation rate-limiting (60s)
--      and UI "letzte Invitation: vor X" display.
--   2) Adds RLS policy `team_self_update` so an authenticated user can update
--      their own team_members row (linked via profiles.team_member_id).
--
--      NOTE on column-level write protection: this policy gates ROW access only.
--      Which columns a self-update may modify (allowed: phone, date_of_birth,
--      show_birthday, possibly avatar_asset_id; FORBIDDEN: first_name,
--      last_name, position, department, email, sort_order, is_lead,
--      joined_year, tools, tasks, auth_user_id, last_invited_at) is enforced
--      in the server action `updateOwnProfile` in src/lib/users.ts (planned
--      for AP 3). Do not rely on this policy for column-level whitelisting.
--
-- Source: spec/USER_MGMT_RECON.md §4/§9; implementation plan AP 1.
-- ============================================================================

-- 1. Add last_invited_at column
ALTER TABLE public.team_members
  ADD COLUMN last_invited_at timestamptz;

-- 2. RLS policy: user may update their own team_members row
--    Maps via profiles.team_member_id (FK to team_members.id) keyed on auth.uid().
CREATE POLICY team_self_update ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT team_member_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    id = (SELECT team_member_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- End of migration.
-- ============================================================================

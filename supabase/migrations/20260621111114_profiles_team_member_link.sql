-- 0034_profiles_team_member_link
--
-- Stufe 1 des User-Panel-Plans (Option A aus Advisor-Review Finding 1):
-- profiles bleibt schlank für Auth-Identität, team_members ist Single Source
-- der Stammdaten. Diese Migration legt den Brücken-FK von profiles → team_members,
-- plus ein updated_at-Feld für künftige Audit-Spuren auf profiles.
--
-- Bewusste Nicht-Entscheidungen dieser Migration:
--   • Kein RLS-Touch (profiles_role_escalation_guard aus 0032 bleibt unangetastet)
--   • Kein Trigger auf auth.users (last_sign_in_at kommt via View in 0037)
--   • Kein Backfill von team_member_id (kommt in Stufe 8 Pre-Seeding)
--   • Kein updated_at-Trigger (Setzen passiert in den users.ts-Actions in Stufe 6)

ALTER TABLE public.profiles
  ADD COLUMN team_member_id uuid
    REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Lookup-Index für den FK (häufig in JOINs der User-Liste verwendet)
CREATE INDEX idx_profiles_team_member_id
  ON public.profiles(team_member_id)
  WHERE team_member_id IS NOT NULL;

-- Unique-Constraint: ein team_member kann nur EINEM auth-User gehören
CREATE UNIQUE INDEX idx_profiles_team_member_id_unique
  ON public.profiles(team_member_id)
  WHERE team_member_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.team_member_id IS
  'Bridge to team_members for stammdaten (name, position, department, avatar). NULL = profile has no linked team member (e.g. dev@airtuerk.de). ON DELETE SET NULL: deleting a team_member does not delete the auth profile.';

COMMENT ON COLUMN public.profiles.updated_at IS
  'Last modification timestamp. Set explicitly in users.ts actions, no auto-trigger.';

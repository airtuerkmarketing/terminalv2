-- D-070 — Self-service profile fields + tighten directory read.
--
-- Adds the personal-profile fields every user can edit on their own team_members
-- row (the canonical person record; profiles stays the thin auth shadow). DoB
-- (date_of_birth), work phone (phone) and show_birthday already exist and are
-- reused — not duplicated here.
--
-- Also tightens the directory SELECT policy from `public` (anon) to
-- `authenticated`: the whole app is login-gated, and team_members now carries
-- semi-private contact data (private_phone), so the anon publishable key must not
-- be able to read the directory at the DB layer. /team reads via the cookie-bound
-- server client (authenticated); the AI `query_team_directory` tool reads via the
-- service role (bypasses RLS) — both unaffected.

-- 1. New self-editable columns (all nullable, free-text).
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS status_line   text,
  ADD COLUMN IF NOT EXISTS about         text,
  ADD COLUMN IF NOT EXISTS location      text,
  ADD COLUMN IF NOT EXISTS company       text,
  ADD COLUMN IF NOT EXISTS website       text,
  ADD COLUMN IF NOT EXISTS github        text,
  ADD COLUMN IF NOT EXISTS linkedin      text,
  ADD COLUMN IF NOT EXISTS instagram     text,
  ADD COLUMN IF NOT EXISTS private_phone text;

-- 2. Hard 50-char cap on the status line (the app validates too; this is the
--    DB-level floor so the limit holds regardless of the write path).
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_status_line_len;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_status_line_len
  CHECK (status_line IS NULL OR char_length(status_line) <= 50);

-- 3. Tighten directory read: anon → authenticated. (Write policies
--    team_modify_admin + team_self_update are unchanged.)
DROP POLICY IF EXISTS team_select_public ON public.team_members;
CREATE POLICY team_select_authenticated ON public.team_members
  FOR SELECT TO authenticated USING (true);

COMMENT ON COLUMN public.team_members.status_line IS
  'Short status line (≤50 chars), e.g. "Happy to work". Self-editable.';
COMMENT ON COLUMN public.team_members.private_phone IS
  'Private phone — NOT exposed in the public /team projection (only self + admin).';

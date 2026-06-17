-- 0018_team_members_extended_fields.sql
-- Phase 4 — extend team_members with the richer fields the Webflow team source
-- carries, so the Team Directory can later grow a detail modal (tools chips,
-- tenure, task description, lead badge) without another schema change.
--   • is_lead     — team/department lead flag (drives a future badge)
--   • joined_year — tenure ("Beigetreten" stat in the modal)
--   • tools       — text[] of tool names (modal tool icons)
--   • tasks       — long-form responsibilities text (modal body)
-- The initial /team component (this phase) renders only name/position/avatar/
-- department; these columns are seeded now but stay UI-dormant until the modal
-- follow-up task. Idempotent via IF NOT EXISTS.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_lead     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS joined_year int,
  ADD COLUMN IF NOT EXISTS tools       text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tasks       text;

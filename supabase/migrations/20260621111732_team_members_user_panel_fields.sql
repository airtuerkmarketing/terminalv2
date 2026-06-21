-- 0035_team_members_user_panel_fields
--
-- Stufe 2 des User-Panel-Plans.
-- team_members ist Single Source der Stammdaten (Option A aus Advisor Finding 1).
-- Diese Migration ergänzt vier User-Panel-Felder:
--
--   • auth_user_id    — bidirektionaler FK zur Auth-Identität (Gegenstück zu
--                       profiles.team_member_id aus 0034). NULL = Mitarbeiter
--                       ohne Auth-Konto (noch nicht invited oder bewusst ohne).
--   • date_of_birth   — Geburtsdatum aus HR-Excel. Verwendung nur mit
--                       show_birthday=true (DSGVO-konform per Opt-in).
--   • show_birthday   — Opt-in für Birthday-Card-Feature. Default false.
--   • phone           — optional, Profile-Card Phase 2.

ALTER TABLE public.team_members
  ADD COLUMN auth_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN date_of_birth date,
  ADD COLUMN show_birthday boolean NOT NULL DEFAULT false,
  ADD COLUMN phone text;

-- Lookup-Index für den FK (häufig im User-Panel, Org-View, Activity-Log)
CREATE INDEX idx_team_members_auth_user_id
  ON public.team_members(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Unique-Constraint: ein Auth-User kann nur EINEM team_member gehören
CREATE UNIQUE INDEX idx_team_members_auth_user_id_unique
  ON public.team_members(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Case-insensitive Email-Lookup-Index für Stufe 8 (Pre-Seeding)
CREATE INDEX idx_team_members_email_lower
  ON public.team_members(lower(email))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.team_members.auth_user_id IS
  'Bridge to auth.users for the corresponding login account. NULL = team_member without auth account (not yet invited or intentionally without). Bidirectional with profiles.team_member_id.';

COMMENT ON COLUMN public.team_members.date_of_birth IS
  'HR record. ONLY display/use when show_birthday=true (DSGVO-konform per opt-in).';

COMMENT ON COLUMN public.team_members.show_birthday IS
  'Opt-in for birthday card feature. Default false (DSGVO: explicit consent required).';

COMMENT ON COLUMN public.team_members.phone IS
  'Optional, internal phone number. Phase-2 profile card feature.';

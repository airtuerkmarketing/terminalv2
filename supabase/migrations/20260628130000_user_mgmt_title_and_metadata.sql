-- ─────────────────────────────────────────────────────────────────────────────
-- User-management V1 — title (salutation/honorific) + metadata escape-hatch,
-- with DB-level column protection for the self-update path.
--
-- Adds two columns to team_members (the stammdaten source — first_name/last_name/
-- position already live here, so a salutation + an ad-hoc bag belong here, NOT on
-- the thin `profiles` auth shadow). Both are additive and nullable/defaulted so
-- the 63 existing rows are untouched. Idempotent (house style: ADD COLUMN IF NOT
-- EXISTS; DROP CONSTRAINT IF EXISTS then ADD; CREATE OR REPLACE; DROP TRIGGER IF
-- EXISTS then CREATE).
--
--  - title:    free-text honorific ("Dr.", "Herr", "Frau", …) or NULL. NOT an
--              enum — matches the status_line free-text + length-cap house style
--              so a new honorific never needs a migration. Soft cap ≤20.
--  - metadata: jsonb forward-compat bag for ad-hoc, NON-queried annotations only.
--              Every queried/validated/sorted/displayed field stays a typed
--              column — metadata is NOT a substitute for one. Object-only.
--
-- Privacy: neither column is auto-exposed. Every consumer uses an explicit column
-- list (pages.ts /team, rag-query KI tool, auth.ts identity), so a new column is
-- invisible until deliberately wired in. `metadata` MUST stay out of the public
-- /team projection + the RAG whitelist (it can hold anything).
--
-- COLUMN PROTECTION (review finding C-1): team_members RLS gates the ROW, not
-- columns — `team_self_update` (20260624111148) lets any authenticated user PATCH
-- their OWN row. Without a guard, a user could self-write `title`/`metadata` via a
-- direct PostgREST call, contradicting the "admin-only / write-reserved" intent.
-- A BEFORE UPDATE trigger closes this: it blocks an RLS-client (authenticated/anon)
-- NON-admin from changing title/metadata. The admin mutation path runs as the
-- service_role client (current_user = 'service_role') and passes freely; an
-- authenticated admin (team_modify_admin) passes via is_admin(). NOTE: we gate on
-- current_user, NOT is_admin() alone, because is_admin() reads auth.uid() which is
-- NULL under the service_role client (it would otherwise block the admin's own
-- writes — verified against 20260620000000/20260621190523).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Soft length guard on title (mirrors the team_members_status_line_len pattern).
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_title_len;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_title_len
  CHECK (title IS NULL OR char_length(title) <= 20);

-- metadata must be a JSON object (forbid arrays/scalars like '[]' or '"x"' or 1).
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_metadata_object;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_metadata_object
  CHECK (jsonb_typeof(metadata) = 'object');

COMMENT ON COLUMN public.team_members.title IS
  'Salutation / honorific (free text, e.g. "Dr.", "Herr", "Frau") or NULL. Admin-editable only (enforced by trg_team_members_protect_admin_cols).';
COMMENT ON COLUMN public.team_members.metadata IS
  'Forward-compat jsonb bag ({} default, object-only) for ad-hoc, non-queried annotations. NOT a substitute for typed columns; never auto-exposed (kept out of /team + RAG whitelist). Admin-write only (enforced by trg_team_members_protect_admin_cols).';

-- C-1: DB-level column protection for the self-update path. SECURITY INVOKER
-- (default) so current_user reflects the effective request role (service_role /
-- authenticated / anon). SET search_path satisfies the function_search_path
-- advisor; public.is_admin() is fully qualified so the search_path is not relied
-- on for resolution.
CREATE OR REPLACE FUNCTION public.team_members_protect_admin_cols()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only constrain the RLS-client roles. The service_role admin mutation client
  -- and the table owner / superuser (migrations, SQL editor) pass freely.
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
      RAISE EXCEPTION 'PROTECTED_COLUMN: title and metadata are admin-only'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_members_protect_admin_cols ON public.team_members;
CREATE TRIGGER trg_team_members_protect_admin_cols
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.team_members_protect_admin_cols();

-- ─────────────────────────────────────────────────────────────────────────────
-- Registry note (apply time, per CLAUDE.md): register version 20260628130000 in
-- supabase_migrations.schema_migrations under a MATCHING version (apply_migration /
-- db push do this; or execute_sql + an explicit registry row). supabase/migrations/
-- must stay in EXACT parity with the registry — verify by HASHING the sorted
-- version set, not counting. Prod write needs explicit owner sign-off.
-- ─────────────────────────────────────────────────────────────────────────────

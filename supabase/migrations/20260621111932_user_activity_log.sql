-- 0036_user_activity_log
--
-- Stufe 3 des User-Panel-Plans.
-- Audit-Trail für User-Aktionen (Login, Upload, Folder-Create, Profile-Edit, etc.).
-- Wird in Stufe 9 von den existierenden Actions in documents-library und
-- presentation-hub befüllt, plus von Auth-Hooks.
--
-- Sicherheits-Modell:
--   • RLS enabled + forced
--   • Reads: super_admin alles, admin eigenes Department, user eigene Zeilen
--   • Writes: NUR Service-Role (keine INSERT/UPDATE/DELETE-Policies für
--     authenticated — Activity-Logs müssen unfälschbar sein, Client darf
--     niemals direkt schreiben)
--   • Helper-Functions is_super_admin() / is_admin() aus dem bestehenden
--     Role-Model (Migration 0030) wiederverwendet — kein Subquery-Duplikat
--
-- Retention: 13 Monate, pg_cron-Cleanup folgt separat sobald Extension aktiv
-- (DSGVO: Audit-Logs nicht endlos behalten, aber Jahres-Audit-Spanne sicher).

CREATE TABLE public.user_activity_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  resource_type text,
  resource_id   uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Hot-Path-Index: User-Detail-View zeigt letzte N Aktionen eines Users
CREATE INDEX idx_activity_user_created
  ON public.user_activity_log(user_id, created_at DESC);

-- Cleanup-Index: pg_cron-Job löscht alte Zeilen via created_at-Range-Scan
CREATE INDEX idx_activity_created
  ON public.user_activity_log(created_at DESC);

-- RLS scharf einschalten + erzwingen (auch für Tabellen-Owner)
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log FORCE ROW LEVEL SECURITY;

-- READ POLICIES ---------------------------------------------------------------

-- super_admin sieht alle Activity-Einträge
CREATE POLICY "activity_super_admin_read_all"
  ON public.user_activity_log
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- admin sieht Activity nur von Usern aus dem eigenen Department.
-- Funktioniert nur, wenn beide (admin und subject) ein team_member haben
-- (über profiles.team_member_id verknüpft).
CREATE POLICY "activity_admin_read_department"
  ON public.user_activity_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    AND user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles admin_p
      JOIN public.team_members admin_tm ON admin_tm.id = admin_p.team_member_id
      JOIN public.team_members subject_tm ON subject_tm.auth_user_id = user_activity_log.user_id
      WHERE admin_p.id = auth.uid()
        AND admin_tm.department = subject_tm.department
        AND admin_tm.department IS NOT NULL
    )
  );

-- Jeder eingeloggte User sieht seine eigenen Activity-Einträge
-- (DSGVO Auskunftspflicht)
CREATE POLICY "activity_self_read"
  ON public.user_activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- KEINE Write-Policies — Writes laufen ausschließlich über Service-Role
-- in src/lib/users.ts logActivity() Helper aus Stufe 6/9.

COMMENT ON TABLE public.user_activity_log IS
  'Audit-trail for user actions. Writes via service role only. Retention 13 months via pg_cron (separate migration).';

COMMENT ON COLUMN public.user_activity_log.action IS
  'Free-form action identifier, e.g. "login", "upload_file", "create_folder", "edit_profile", "update_role".';

COMMENT ON COLUMN public.user_activity_log.resource_type IS
  'Type of affected resource: "document", "presentation", "folder", "profile", "team_member", or NULL for global actions like "login".';

COMMENT ON COLUMN public.user_activity_log.metadata IS
  'Free-form jsonb for action context (e.g. previous values, file size, target folder path). Keep payload small (<2KB).';

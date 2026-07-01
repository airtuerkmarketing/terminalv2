-- ============================================================================
-- 20260701000000_d111_role_rewrite.sql
-- ============================================================================
-- D-111a — Role Model Rewrite + Audit Events Infrastructure.
--
-- Adds department_admin, ai_admin roles; removes admin role (Approach 3:
-- is_admin() untouched, admin tier drained so it collapses to super_admin only).
-- Adds structured audit_events table. Widens RLS for owner-based Documents
-- Library access and ai_admin knowledge/source writes.
--
-- Roster end state: super_admin=5, department_admin=4, ai_admin=2, user=1.
-- Invite-first (no auth account today): Sibel Tobolewski, Emre Karakas — seeded
-- into user_role_defaults so handle_new_user() assigns department_admin on confirm.
--
-- Applied to prod via execute_sql + an explicit schema_migrations row at version
-- 20260701000000 (controlled-timestamp pattern, D-081). Rollback snapshots:
-- _d111_role_snapshot, _d111_defaults_snapshot (24h clean-rollback window; after
-- 24h dept_admins may have created folders/grants → forward-fix only).
-- ============================================================================

BEGIN;

-- Snapshot for 24h clean rollback window
CREATE TABLE _d111_role_snapshot AS
SELECT id, email, role, updated_at
FROM profiles;

CREATE TABLE _d111_defaults_snapshot AS
SELECT email, role
FROM user_role_defaults;

-- ------------------------------------------------------------
-- Step 1: Temporarily widen CHECK to allow all 5 values
-- ------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'department_admin', 'ai_admin', 'user'));

ALTER TABLE user_role_defaults DROP CONSTRAINT user_role_defaults_role_check;
ALTER TABLE user_role_defaults ADD CONSTRAINT user_role_defaults_role_check
  CHECK (role IN ('super_admin', 'admin', 'department_admin', 'ai_admin', 'user'));

-- ------------------------------------------------------------
-- Step 2: Update profiles per explicit allow-list
-- ------------------------------------------------------------
-- super_admin: 5 (Buhara, Emirkan, Ümit, Ahmet, dev@)
UPDATE profiles SET role = 'super_admin', updated_at = NOW()
WHERE email IN (
  'bdemir@airtuerk.de',
  'eerkara@airtuerk.de',
  'utenekeci@airtuerk.de',
  'aoezbek@airtuerk.de',
  'dev@airtuerk.de'
);

-- department_admin: 4 existing (Hakan, Tim, Oruc, Efkan)
UPDATE profiles SET role = 'department_admin', updated_at = NOW()
WHERE email IN (
  'hakan@airtuerk.de',
  'tsahin@airtuerk.de',
  'odemir@airtuerk.de',
  'ebarin@airtuerk.de'
);

-- ai_admin: 2 (Murat, Selin Köroglu)
UPDATE profiles SET role = 'ai_admin', updated_at = NOW()
WHERE email IN (
  'msinim@airtuerk.de',
  'skoeroglu@airtuerk.de'
);

-- user: explicit demote for Esra
UPDATE profiles SET role = 'user', updated_at = NOW()
WHERE email = 'eadiguezel@airtuerk.de';

-- ------------------------------------------------------------
-- Step 3: Update user_role_defaults stale 'admin' rows
-- ------------------------------------------------------------
-- The 5 existing admin defaults must be updated BEFORE removing 'admin' from CHECK.
UPDATE user_role_defaults SET role = 'department_admin'
WHERE email IN (
  'hakan@airtuerk.de',
  'tsahin@airtuerk.de',
  'odemir@airtuerk.de'
);

UPDATE user_role_defaults SET role = 'ai_admin'
WHERE email IN (
  'msinim@airtuerk.de',
  'skoeroglu@airtuerk.de'
);

-- ------------------------------------------------------------
-- Step 4: Seed invite-first users (Sibel + Emre)
-- ------------------------------------------------------------
INSERT INTO user_role_defaults (email, role) VALUES
  ('stobolewski@airtuerk.de', 'department_admin'),
  ('ekarakas@airtuerk.de', 'department_admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- ------------------------------------------------------------
-- Step 5: Assert admin tier is empty (fail migration if not)
-- ------------------------------------------------------------
DO $$
DECLARE
  admin_count_profiles INTEGER;
  admin_count_defaults INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count_profiles FROM profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO admin_count_defaults FROM user_role_defaults WHERE role = 'admin';

  IF admin_count_profiles > 0 THEN
    RAISE EXCEPTION 'Migration abort: % profiles still have role=admin', admin_count_profiles;
  END IF;

  IF admin_count_defaults > 0 THEN
    RAISE EXCEPTION 'Migration abort: % user_role_defaults still have role=admin', admin_count_defaults;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Step 6: Final CHECK constraint — remove 'admin' (hardening)
-- ------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'department_admin', 'ai_admin', 'user'));

ALTER TABLE user_role_defaults DROP CONSTRAINT user_role_defaults_role_check;
ALTER TABLE user_role_defaults ADD CONSTRAINT user_role_defaults_role_check
  CHECK (role IN ('super_admin', 'department_admin', 'ai_admin', 'user'));

-- ------------------------------------------------------------
-- Step 7: New role helpers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_dept_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'department_admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_ai_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ai_admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_dept_or_ai_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT is_dept_admin() OR is_ai_admin();
$$;

-- ------------------------------------------------------------
-- Step 8: RLS policies — Documents Library
-- ------------------------------------------------------------

-- document_folders SELECT: add owner branch
DROP POLICY IF EXISTS document_folders_select ON document_folders;
CREATE POLICY document_folders_select ON document_folders FOR SELECT
USING (
  is_public
  OR is_admin()
  OR can_see_document_folder(id)
  OR (is_dept_or_ai_admin() AND created_by = auth.uid())
);

-- document_files SELECT: folder-scoped ownership via join
DROP POLICY IF EXISTS document_files_select ON document_files;
CREATE POLICY document_files_select ON document_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_folders f
    WHERE f.id = folder_id
    AND (
      f.is_public
      OR is_admin()
      OR can_access_document_folder(f.id)
      OR (is_dept_or_ai_admin() AND f.created_by = auth.uid())
    )
  )
);

-- document_folder_permissions: widen writes for owner
DROP POLICY IF EXISTS document_folder_permissions_insert ON document_folder_permissions;
CREATE POLICY document_folder_permissions_insert ON document_folder_permissions FOR INSERT
WITH CHECK (
  is_super_admin()
  OR (
    is_dept_or_ai_admin()
    AND EXISTS (
      SELECT 1 FROM document_folders f
      WHERE f.id = folder_id AND f.created_by = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS document_folder_permissions_update ON document_folder_permissions;
CREATE POLICY document_folder_permissions_update ON document_folder_permissions FOR UPDATE
USING (
  is_super_admin()
  OR (
    is_dept_or_ai_admin()
    AND EXISTS (
      SELECT 1 FROM document_folders f
      WHERE f.id = folder_id AND f.created_by = auth.uid()
    )
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    is_dept_or_ai_admin()
    AND EXISTS (
      SELECT 1 FROM document_folders f
      WHERE f.id = folder_id AND f.created_by = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS document_folder_permissions_delete ON document_folder_permissions;
CREATE POLICY document_folder_permissions_delete ON document_folder_permissions FOR DELETE
USING (
  is_super_admin()
  OR (
    is_dept_or_ai_admin()
    AND EXISTS (
      SELECT 1 FROM document_folders f
      WHERE f.id = folder_id AND f.created_by = auth.uid()
    )
  )
);

-- ------------------------------------------------------------
-- Step 9: RLS policies — AI-Correction Workflow
-- ------------------------------------------------------------

-- Widen corrections_admin_review to include ai_admin
DROP POLICY IF EXISTS corrections_admin_review ON ai_corrections;
CREATE POLICY corrections_admin_review ON ai_corrections FOR UPDATE
USING (is_admin() OR is_super_admin() OR is_ai_admin())
WITH CHECK (is_admin() OR is_super_admin() OR is_ai_admin());

-- Widen company_context writes for ai_admin (direct source entry)
DROP POLICY IF EXISTS company_context_admin_insert ON company_context;
CREATE POLICY company_context_admin_insert ON company_context FOR INSERT
WITH CHECK (is_admin() OR is_super_admin() OR is_ai_admin());

DROP POLICY IF EXISTS company_context_admin_update ON company_context;
CREATE POLICY company_context_admin_update ON company_context FOR UPDATE
USING (is_admin() OR is_super_admin() OR is_ai_admin())
WITH CHECK (is_admin() OR is_super_admin() OR is_ai_admin());

-- ------------------------------------------------------------
-- Step 10: Structured audit_events table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  before JSONB,
  after JSONB,
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_audit_events_ts ON audit_events(ts DESC);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, ts DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action, ts DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, ts DESC);

-- RLS: super_admin can read all, others can read only their own actions
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_select ON audit_events FOR SELECT
USING (
  is_super_admin()
  OR actor_id = auth.uid()
);

-- Writes go via service role only (server actions)
-- No INSERT/UPDATE/DELETE policies = default deny for RLS clients

COMMIT;

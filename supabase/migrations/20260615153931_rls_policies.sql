-- ============================================================================
-- terminalv2 — Row Level Security
-- Migration: 0002_rls_policies.sql
-- Description: Enables RLS on all tables and creates policies.
-- ============================================================================

-- Helper function: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- brands
-- ----------------------------------------------------------------------------
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_select_public ON brands
  FOR SELECT USING (true);

CREATE POLICY brands_modify_admin ON brands
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- pages
-- ----------------------------------------------------------------------------
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_select_published ON pages
  FOR SELECT USING (status = 'published');

CREATE POLICY pages_select_admin ON pages
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY pages_modify_admin ON pages
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- blocks
-- ----------------------------------------------------------------------------
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocks_select_if_page_published ON blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = blocks.page_id
        AND pages.status = 'published'
    )
  );

CREATE POLICY blocks_select_admin ON blocks
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY blocks_modify_admin ON blocks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- assets, documents, team_members, team_member_brands
-- All public-readable, admin-writable
-- ----------------------------------------------------------------------------

ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;

CREATE POLICY assets_select_public ON assets FOR SELECT USING (true);
CREATE POLICY assets_modify_admin  ON assets FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY documents_select_public ON documents FOR SELECT USING (true);
CREATE POLICY documents_modify_admin  ON documents FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY team_select_public ON team_members FOR SELECT USING (true);
CREATE POLICY team_modify_admin  ON team_members FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY tmb_select_public ON team_member_brands FOR SELECT USING (true);
CREATE POLICY tmb_modify_admin  ON team_member_brands FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY settings_select_public ON settings FOR SELECT USING (true);
CREATE POLICY settings_modify_admin  ON settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- profiles  (users can read/update only their own row)
-- ----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
  -- Users CANNOT change their own role via UPDATE (the WITH CHECK locks it)

-- Admins can see all profiles (useful for admin user list)
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT TO authenticated
  USING (is_admin());

-- Admins can update any profile (for assigning roles)
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

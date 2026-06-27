-- ============================================================================
-- terminalv2 — Profile creation trigger
-- Migration: 0006_profiles_trigger.sql
-- Description: Auto-creates a profile row whenever a new user signs up
--              via auth.users. If their email matches the configured
--              initial_admin_email, they get role='admin'; otherwise
--              role='viewer'.
-- ============================================================================

-- Function: handle new auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initial_admin_email text;
  default_role text;
BEGIN
  -- Read the initial admin email from a Postgres config setting.
  -- This is set per-environment via:
  --   ALTER DATABASE postgres SET app.initial_admin_email = '<email>';
  -- If unset, current_setting() returns empty string.
  BEGIN
    initial_admin_email := current_setting('app.initial_admin_email', true);
  EXCEPTION WHEN OTHERS THEN
    initial_admin_email := '';
  END;

  IF initial_admin_email <> '' AND NEW.email = initial_admin_email THEN
    default_role := 'admin';
  ELSE
    default_role := 'viewer';
  END IF;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    default_role
  );

  RETURN NEW;
END;
$$;

-- Trigger fires after every insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- Setup note (manual step, performed once after migration):
--
-- After running this migration, set the initial admin email at the database
-- level so the trigger knows who to promote:
--
--   ALTER DATABASE postgres
--     SET app.initial_admin_email = 'buhara@airtuerk.de';
--
-- Then create the user in Supabase Studio (Authentication → Users → Add user).
-- The trigger fires automatically and sets their role to 'admin'.
-- ----------------------------------------------------------------------------

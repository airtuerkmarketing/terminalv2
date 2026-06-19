-- ============================================================================
-- terminalv2 — Three-tier role model (PART A of File System v2)
-- Migration: 0030_role_model.sql
-- Description: Replaces the old profiles.role set ('admin','editor','viewer')
--              with ('super_admin','admin','user') and makes role assignment
--              data-driven via a user_role_defaults lookup applied by the signup
--              trigger. is_admin() is KEPT (name + signature) so every existing
--              RLS policy across the app (brands, pages, blocks, confluence_*,
--              storage, …) keeps working unchanged — it now means admin OR
--              super_admin. A new is_super_admin() gates structural/sensitive ops.
--
--              Decisions logged: D-047 (three-tier roles), D-048 (data-driven
--              assignment). Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles.role — swap the CHECK + migrate existing values
--    Order matters: collapse editor/viewer → user BEFORE adding the new CHECK,
--    otherwise the new constraint would reject pre-existing legacy rows.
-- ----------------------------------------------------------------------------

-- Drop the old inline CHECK (Postgres auto-named it profiles_role_check).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Default for brand-new rows is now 'user' (the trigger overrides per the table).
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- Collapse the two legacy non-admin roles into 'user'. 'admin' stays 'admin'.
UPDATE public.profiles SET role = 'user' WHERE role IN ('editor', 'viewer');

-- Add the new CHECK (validates the now-clean existing rows).
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'user'));

-- profiles_role_idx from 0001 is unchanged and kept.

-- ----------------------------------------------------------------------------
-- 2. Helper functions
--    is_admin() rewritten to admin OR super_admin (same name/signature).
--    is_super_admin() added with the identical shape.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. user_role_defaults — the canonical email→role assignment (D-048)
--    The later "user settings" UI edits profiles.role directly; this table is
--    the source of truth the signup trigger reads on first login. RLS: only a
--    super-admin may read/write it.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_role_defaults (
  email text PRIMARY KEY,
  role  text NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_role_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_role_defaults_super_admin ON public.user_role_defaults;
CREATE POLICY user_role_defaults_super_admin ON public.user_role_defaults
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Seed (idempotent). 4 super-admins, 5 admins, 2 users.
INSERT INTO public.user_role_defaults (email, role) VALUES
  ('bdemir@airtuerk.de',     'super_admin'),
  ('eerkara@airtuerk.de',    'super_admin'),
  ('utenekeci@airtuerk.de',  'super_admin'),
  ('aoezbek@airtuerk.de',    'super_admin'),
  ('hsezen@airtuerk.de',     'admin'),
  ('tsahin@airtuerk.de',     'admin'),
  ('msinim@airtuerk.de',     'admin'),
  ('bakpinar@airtuerk.de',   'admin'),
  ('skece@airtuerk.de',      'admin'),
  ('akoc@airtuerk.de',       'user'),
  ('uyildirim@airtuerk.de',  'user')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 4. Apply defaults to any already-existing profiles (bdemir → super_admin).
-- ----------------------------------------------------------------------------

UPDATE public.profiles p
SET role = d.role
FROM public.user_role_defaults d
WHERE p.email = d.email AND p.role <> d.role;

-- ----------------------------------------------------------------------------
-- 5. handle_new_user() — look up the role in user_role_defaults on signup.
--    Replaces the single app.initial_admin_email mechanism (kept implicitly
--    irrelevant — the table is now the source of truth). Default 'user'.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  SELECT role INTO assigned_role
  FROM public.user_role_defaults
  WHERE email = NEW.email;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(assigned_role, 'user')
  );

  RETURN NEW;
END;
$$;

-- Trigger from 0006 (on_auth_user_created) is unchanged and keeps firing this fn.

COMMENT ON TABLE public.user_role_defaults IS
  'Canonical email→role assignment (D-048). Signup trigger reads it; the later user-settings UI edits profiles.role directly.';
COMMENT ON FUNCTION public.is_super_admin() IS
  'TRUE when the current user has role=super_admin. Gates structural/sensitive ops (folder delete, visibility toggle, role management).';

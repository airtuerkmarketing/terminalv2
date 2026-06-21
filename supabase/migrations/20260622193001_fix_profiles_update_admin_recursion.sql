-- 0043: Fix infinite recursion in profiles_update_admin policy
--
-- Problem (entdeckt 2026-06-22 in Buhara's Live-Smoke-Test der Stufe
-- 7C-Light beim Rolle-Picker): Die ursprüngliche Policy aus Migration
-- 0032 enthielt einen inline SELECT auf profiles innerhalb der
-- WITH CHECK clause:
--   (role = (SELECT p.role FROM profiles p WHERE p.id = profiles.id))
--
-- Dieser SELECT triggert die SELECT-Policies auf profiles
-- (profiles_select_*), die wiederum is_admin()/is_super_admin()
-- aufrufen. Diese Functions sind zwar SECURITY DEFINER, aber sie
-- machen ihrerseits einen SELECT auf profiles. Postgres erkennt die
-- Rekursion und wirft "42P17: infinite recursion detected in policy
-- for relation profiles".
--
-- Fix: Eine neue SECURITY DEFINER helper function get_profile_role(uid)
-- holt die aktuelle Rolle, ohne die RLS auszulösen.

CREATE OR REPLACE FUNCTION public.get_profile_role(p_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = p_id;
$$;

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (
    is_admin()
    AND (
      is_super_admin()
      OR role = get_profile_role(id)
    )
  );

GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;

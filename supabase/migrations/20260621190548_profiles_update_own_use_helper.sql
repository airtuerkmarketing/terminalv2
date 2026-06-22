-- 0045: profiles_update_own hatte den gleichen inline-SELECT Bug wie
-- profiles_update_admin. Postgres evaluiert ALLE matching Policies —
-- auch wenn ein super_admin einen anderen Account updated, wird
-- profiles_update_own mit ausgewertet (auch wenn dessen USING false ist).
-- Der inline SELECT in WITH CHECK löst die Rekursion aus.
--
-- Fix mit get_profile_role() Helper aus 0043.

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = get_profile_role(id)
  );

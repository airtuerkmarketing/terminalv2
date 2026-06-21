-- 0040_rls_auth_uid_initplan_fix
--
-- Performance-Fix: 4 RLS-Policies riefen auth.uid() pro Zeile auf statt pro Query.
-- Postgres-Pattern: (select auth.uid()) wird einmal initPlan-evaluiert, dann gecacht.
-- Bei kleinem Datenvolumen unmerklich, aber sauberer Stand für künftiges Wachstum.
--
-- Betroffene Policies:
--   • public.profiles.profiles_select_own
--   • public.profiles.profiles_update_own (USING + WITH CHECK)
--   • public.user_activity_log.activity_admin_read_department
--   • public.user_activity_log.activity_self_read
--
-- Funktionsgleich, nur Performance-optimiert.

-- 1) profiles_select_own
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

-- 2) profiles_update_own (USING + WITH CHECK)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (
    id = (select auth.uid())
    AND role = (
      SELECT profiles_1.role
      FROM public.profiles profiles_1
      WHERE profiles_1.id = (select auth.uid())
    )
  );

-- 3) activity_admin_read_department
DROP POLICY IF EXISTS "activity_admin_read_department" ON public.user_activity_log;
CREATE POLICY "activity_admin_read_department"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    AND user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles admin_p
      JOIN public.team_members admin_tm ON admin_tm.id = admin_p.team_member_id
      JOIN public.team_members subject_tm ON subject_tm.auth_user_id = user_activity_log.user_id
      WHERE admin_p.id = (select auth.uid())
        AND admin_tm.department = subject_tm.department
        AND admin_tm.department IS NOT NULL
    )
  );

-- 4) activity_self_read
DROP POLICY IF EXISTS "activity_self_read" ON public.user_activity_log;
CREATE POLICY "activity_self_read"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

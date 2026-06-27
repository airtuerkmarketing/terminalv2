-- ============================================================================
-- 20260627130000_rls_initplan_fix.sql
-- ============================================================================
-- D-084 — Performance: wrap auth.uid() in (select auth.uid()) for the 8 remaining
-- per-user RLS policies flagged by the auth_rls_initplan advisor
-- (spec/HEALTH_CHECK_2026-06-27.md §5). Mirrors the earlier
-- 20260621161007_rls_auth_uid_initplan_fix.sql, for policies added since.
--
-- ALTER POLICY edits the expression in place (no DROP/CREATE window). Semantics
-- are unchanged — only auth.uid() is wrapped so PostgreSQL evaluates it once per
-- query (InitPlan) instead of once per row.
--
-- Applied to prod via execute_sql + an explicit schema_migrations row at version
-- 20260627130000 (controlled ordering, consistent with D-083). Reversible: re-run
-- ALTER POLICY with the bare auth.uid() form.
-- ============================================================================

alter policy messages_own_feedback_update on public.ai_chat_messages
  using (exists (select 1 from ai_chat_sessions where ai_chat_sessions.id = ai_chat_messages.session_id and ai_chat_sessions.user_id = (select auth.uid())));

alter policy messages_own_select on public.ai_chat_messages
  using (exists (select 1 from ai_chat_sessions where ai_chat_sessions.id = ai_chat_messages.session_id and ((ai_chat_sessions.user_id = (select auth.uid())) or is_super_admin())));

alter policy sessions_own_insert on public.ai_chat_sessions
  with check (user_id = (select auth.uid()));

alter policy sessions_own_select on public.ai_chat_sessions
  using ((user_id = (select auth.uid())) or is_super_admin());

alter policy sessions_own_update on public.ai_chat_sessions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy corrections_own_insert on public.ai_corrections
  with check (submitted_by = (select auth.uid()));

alter policy corrections_own_select on public.ai_corrections
  using ((submitted_by = (select auth.uid())) or is_admin() or is_super_admin());

alter policy team_self_update on public.team_members
  using (id = (select profiles.team_member_id from profiles where profiles.id = (select auth.uid())))
  with check (id = (select profiles.team_member_id from profiles where profiles.id = (select auth.uid())));

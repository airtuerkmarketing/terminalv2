-- ============================================================================
-- 20260628120000_revoke_secdef_anon_public.sql
-- ============================================================================
-- D-089 — Security: revoke anon/PUBLIC EXECUTE on RLS-critical SECDEF helpers.
--
-- SCOPED to 5 of the 8 candidates. Per spec/SECDEF_REVOKE_TEST_PLAN.md, but a
-- pre-flight check of pg_policies found that THREE helpers are referenced by the
-- `{public}` SELECT policies `document_folders_select` / `document_files_select`,
-- which serve `is_public` Document-Library folders/files to ANONYMOUS visitors by
-- design (see the header of src/lib/documents.ts). Revoking anon EXECUTE on those
-- would make every anon Document-Library read raise `permission denied for
-- function …` instead of returning the public rows. So they are KEPT
-- anon-executable:
--   - is_admin()
--   - can_access_document_folder(uuid)
--   - can_see_document_folder(uuid)
--
-- The remaining 5 are referenced ONLY by `{authenticated}` policies (verified via
-- pg_policies) and are not called by any app `.rpc()` path, so anon never needs
-- them — revoke is pure attack-surface reduction:
--   - is_super_admin()
--   - get_profile_role(uuid)
--   - current_team_member_id()
--   - can_access_presentation_folder(uuid)
--   - can_see_presentation_folder(uuid)
--
-- `authenticated` keeps EXECUTE on all (RLS evaluates them as the authenticated
-- role). handle_new_user() was already locked in D-085.
--
-- Applied via execute_sql + schema_migrations row at version 20260628120000.
-- Reversible: grant execute on function public.<fn> to anon, public;
-- ============================================================================

grant execute on function public.is_super_admin()                     to authenticated;
grant execute on function public.get_profile_role(uuid)               to authenticated;
grant execute on function public.current_team_member_id()             to authenticated;
grant execute on function public.can_access_presentation_folder(uuid) to authenticated;
grant execute on function public.can_see_presentation_folder(uuid)    to authenticated;

revoke execute on function public.is_super_admin()                     from anon, public;
revoke execute on function public.get_profile_role(uuid)               from anon, public;
revoke execute on function public.current_team_member_id()             from anon, public;
revoke execute on function public.can_access_presentation_folder(uuid) from anon, public;
revoke execute on function public.can_see_presentation_folder(uuid)    from anon, public;

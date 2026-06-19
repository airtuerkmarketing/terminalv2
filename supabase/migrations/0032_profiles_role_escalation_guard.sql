-- ============================================================================
-- terminalv2 — Profiles role-escalation guard (roles hardening)
-- Migration: 0032_profiles_role_escalation_guard.sql
-- Description: Closes a privilege-escalation hole surfaced by the File System v2
--              server-layer review. The original `profiles_update_admin` policy
--              (0002) allowed ANY admin to UPDATE ANY profile's `role` — so a
--              plain `admin` could self-promote to `super_admin` via the REST
--              API and then perform super-admin-only ops (folder delete, folder
--              visibility toggle, role management). That collapses the
--              admin/super_admin distinction the whole role model depends on.
--
--              Fix: admins may still update profiles, but the `role` column may
--              only change when the actor is a super_admin; otherwise the new
--              role must equal the existing role (same lock pattern as
--              profiles_update_own). Idempotent. (D-047/D-048 hardening.)
-- ============================================================================

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin()
    AND (
      public.is_super_admin()
      -- non-super-admins must leave `role` unchanged (subquery reads the
      -- pre-update value under MVCC, same trick as profiles_update_own).
      OR role = (SELECT p.role FROM public.profiles p WHERE p.id = public.profiles.id)
    )
  );

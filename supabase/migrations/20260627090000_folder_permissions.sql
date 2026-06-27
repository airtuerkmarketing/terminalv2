-- ============================================================================
-- terminalv2 — Per-user folder permissions (D-080)
-- Migration: 20260627090000_folder_permissions.sql
--
-- WHAT
--   A super_admin can grant individual people read access to a PRIVATE folder in
--   the Document Library and/or the Presentation Hub. Access is keyed off
--   team_members (the 63-person directory), NOT auth.users — most people have no
--   account yet, and a grant must persist + activate automatically once they are
--   invited (profiles.team_member_id / team_members.auth_user_id bridge the two).
--
-- ACCESS MODEL (the careful part)
--   • A grant on folder G gives the grantee CONTENT access to G AND every
--     descendant of G (downward inheritance), and to NOTHING above G. So a grant
--     on a subfolder never leaks the parent's content — exactly as specified.
--   • The grantee can SEE the folder TREE along the path to a granted folder
--     (ancestors render as navigation), but those ancestor folders expose NO
--     content (no files, and only the child folders that lead toward a grant).
--     "See the tree, but no content unless granted."
--   • Granted users are READ-ONLY: the write policies stay is_admin()-only, so a
--     grantee can open/download files but cannot rename/move/delete/upload.
--   • is_public folders stay visible to everyone (documents: anon; hub: every
--     authenticated user); is_admin() always sees everything. Grants are purely
--     ADDITIVE on top of those — they only ever widen visibility of private rows.
--
-- WHY SECURITY DEFINER IS SAFE HERE (no RLS recursion)
--   document_folders / document_files / presentation_folders / presentation_files
--   all have FORCE ROW LEVEL SECURITY. The helper functions below are
--   SECURITY DEFINER and (being created in this migration) are OWNED BY postgres,
--   which carries BYPASSRLS. So when a folder's own SELECT policy calls a helper
--   that reads the folder tree, the helper's internal reads BYPASS RLS and never
--   re-enter the policy → no recursion. This is the identical mechanism the
--   app-wide is_admin() / is_super_admin() helpers already rely on.
--
-- Decisions: D-080 (per-user folder permissions). Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. current_team_member_id() — resolve the caller's team_member id.
--    Tries the profiles bridge first (profiles.team_member_id), then the reverse
--    link (team_members.auth_user_id). Returns NULL for accounts with no linked
--    team member (e.g. dev@airtuerk.de) — such a caller simply matches no grants
--    (admins still see everything via is_admin()). NULL never matches a grant
--    because `team_member_id = NULL` evaluates to NULL (not TRUE) in the helpers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT p.team_member_id FROM public.profiles p WHERE p.id = auth.uid()),
    (SELECT t.id FROM public.team_members t WHERE t.auth_user_id = auth.uid())
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Permission tables — one per library (the two folder trees are independent
--    tables, so a single junction can't FK both). Mirrors the codebase's 1:1
--    Document-Library / Presentation-Hub parallel. ON DELETE CASCADE: deleting a
--    folder or a team member cleans up its grants automatically.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_folder_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id      uuid NOT NULL REFERENCES public.document_folders(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id)     ON DELETE CASCADE,
  granted_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, team_member_id)
);
CREATE INDEX IF NOT EXISTS document_folder_permissions_tm_idx
  ON public.document_folder_permissions (team_member_id);
CREATE INDEX IF NOT EXISTS document_folder_permissions_folder_idx
  ON public.document_folder_permissions (folder_id);

CREATE TABLE IF NOT EXISTS public.presentation_folder_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id      uuid NOT NULL REFERENCES public.presentation_folders(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id)         ON DELETE CASCADE,
  granted_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, team_member_id)
);
CREATE INDEX IF NOT EXISTS presentation_folder_permissions_tm_idx
  ON public.presentation_folder_permissions (team_member_id);
CREATE INDEX IF NOT EXISTS presentation_folder_permissions_folder_idx
  ON public.presentation_folder_permissions (folder_id);

-- ----------------------------------------------------------------------------
-- 3. Access helpers — path math is provably LIKE-safe because folder slugs are
--    CHECK-constrained to ^[a-z0-9]+(?:-[a-z0-9]+)*$ (no '%' / '_' / '/'), so the
--    materialized `path` carries no LIKE metacharacters. `g.path || '/%'` matches
--    strict descendants; equality matches the folder itself.
--
--    can_access_* (CONTENT): grant on the folder itself OR any ancestor (a grant
--      higher up cascades DOWN to this folder). Never upward.
--    can_see_*  (TREE): can_access OR a grant exists on some DESCENDANT (so the
--      ancestor chain to a granted folder is navigable) — content stays gated by
--      can_access, which is false for those ancestor-only folders.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_document_folder(_folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_folder_permissions perm
    JOIN public.document_folders grant_f ON grant_f.id = perm.folder_id
    JOIN public.document_folders target  ON target.id  = _folder_id
    WHERE perm.team_member_id = public.current_team_member_id()
      AND (target.path = grant_f.path OR target.path LIKE grant_f.path || '/%')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_see_document_folder(_folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_folder_permissions perm
    JOIN public.document_folders grant_f ON grant_f.id = perm.folder_id
    JOIN public.document_folders target  ON target.id  = _folder_id
    WHERE perm.team_member_id = public.current_team_member_id()
      AND (
        target.path = grant_f.path
        OR target.path LIKE grant_f.path || '/%'   -- target is at/below the grant → accessible
        OR grant_f.path LIKE target.path || '/%'   -- grant is below target → target is an ancestor (tree only)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_presentation_folder(_folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.presentation_folder_permissions perm
    JOIN public.presentation_folders grant_f ON grant_f.id = perm.folder_id
    JOIN public.presentation_folders target  ON target.id  = _folder_id
    WHERE perm.team_member_id = public.current_team_member_id()
      AND (target.path = grant_f.path OR target.path LIKE grant_f.path || '/%')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_see_presentation_folder(_folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.presentation_folder_permissions perm
    JOIN public.presentation_folders grant_f ON grant_f.id = perm.folder_id
    JOIN public.presentation_folders target  ON target.id  = _folder_id
    WHERE perm.team_member_id = public.current_team_member_id()
      AND (
        target.path = grant_f.path
        OR target.path LIKE grant_f.path || '/%'
        OR grant_f.path LIKE target.path || '/%'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_team_member_id()             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_document_folder(uuid)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_see_document_folder(uuid)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_presentation_folder(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_see_presentation_folder(uuid)    TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 4. RLS on the permission tables. Reads: admins see all; a user may see their
--    own grants. Writes: super_admin only (a backstop — the server actions write
--    with the service role, which bypasses RLS, but the policy keeps the table
--    safe against any RLS-scoped write path). FORCE to match the folder tables.
-- ----------------------------------------------------------------------------
ALTER TABLE public.document_folder_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folder_permissions     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.presentation_folder_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_folder_permissions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_folder_permissions_select ON public.document_folder_permissions;
DROP POLICY IF EXISTS document_folder_permissions_insert ON public.document_folder_permissions;
DROP POLICY IF EXISTS document_folder_permissions_update ON public.document_folder_permissions;
DROP POLICY IF EXISTS document_folder_permissions_delete ON public.document_folder_permissions;
CREATE POLICY document_folder_permissions_select ON public.document_folder_permissions
  FOR SELECT TO authenticated
  USING (public.is_admin() OR team_member_id = public.current_team_member_id());
CREATE POLICY document_folder_permissions_insert ON public.document_folder_permissions
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY document_folder_permissions_update ON public.document_folder_permissions
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY document_folder_permissions_delete ON public.document_folder_permissions
  FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS presentation_folder_permissions_select ON public.presentation_folder_permissions;
DROP POLICY IF EXISTS presentation_folder_permissions_insert ON public.presentation_folder_permissions;
DROP POLICY IF EXISTS presentation_folder_permissions_update ON public.presentation_folder_permissions;
DROP POLICY IF EXISTS presentation_folder_permissions_delete ON public.presentation_folder_permissions;
CREATE POLICY presentation_folder_permissions_select ON public.presentation_folder_permissions
  FOR SELECT TO authenticated
  USING (public.is_admin() OR team_member_id = public.current_team_member_id());
CREATE POLICY presentation_folder_permissions_insert ON public.presentation_folder_permissions
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY presentation_folder_permissions_update ON public.presentation_folder_permissions
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY presentation_folder_permissions_delete ON public.presentation_folder_permissions
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 5. Widen the folder/file SELECT policies with the grant clauses. These REPLACE
--    the existing SELECT policies (the write policies are untouched — grants are
--    read-only). The new clause is the trailing OR can_*; everything else is
--    verbatim from 0031 (documents) and 20260626210000 (presentations).
-- ----------------------------------------------------------------------------

-- Document Library — folders: public to all, admins all, + granted tree path.
DROP POLICY IF EXISTS document_folders_select ON public.document_folders;
CREATE POLICY document_folders_select ON public.document_folders
  FOR SELECT
  USING (is_public OR public.is_admin() OR public.can_see_document_folder(id));

-- Document Library — files: visible when the folder is public, the viewer is an
-- admin, OR the viewer has CONTENT access to the folder (self/ancestor grant).
-- Note can_access (not can_see): ancestor-only tree folders expose no files.
DROP POLICY IF EXISTS document_files_select ON public.document_files;
CREATE POLICY document_files_select ON public.document_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_folders f
      WHERE f.id = public.document_files.folder_id
        AND (f.is_public OR public.is_admin() OR public.can_access_document_folder(f.id))
    )
  );

-- Presentation Hub — folders (login-only): public to every authenticated user,
-- admins all, + granted tree path.
DROP POLICY IF EXISTS presentation_folders_select ON public.presentation_folders;
CREATE POLICY presentation_folders_select ON public.presentation_folders
  FOR SELECT TO authenticated
  USING (is_public OR public.is_admin() OR public.can_see_presentation_folder(id));

-- Presentation Hub — files: folder public, admin, OR content access to the folder.
DROP POLICY IF EXISTS presentation_files_select ON public.presentation_files;
CREATE POLICY presentation_files_select ON public.presentation_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.presentation_folders f
      WHERE f.id = public.presentation_files.folder_id
        AND (f.is_public OR public.is_admin() OR public.can_access_presentation_folder(f.id))
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Close a pre-existing storage-bucket leak that would otherwise DEFEAT this
--    feature for the Presentation Hub. The `presentations` bucket's read policy
--    was blanket-authenticated (`USING (bucket_id = 'presentations')`), so ANY
--    logged-in user could download ANY presentation object directly via the
--    browser client — bypassing both folder visibility (D-079) AND these grants.
--    Tighten it to admin-only, mirroring the Document Library's `library` bucket
--    (0031). Non-admin + granted access is served EXCLUSIVELY through
--    /api/presentations/file/[id], which mints a signed URL with the service role
--    AFTER the RLS-gated row read — so no client ever needs a direct storage
--    SELECT (uploads use token-based uploadToSignedUrl, unaffected). The `library`
--    bucket is already admin-only; nothing to change there.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "presentations_read_auth"  ON storage.objects;
DROP POLICY IF EXISTS "presentations_read_admin" ON storage.objects;
CREATE POLICY "presentations_read_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'presentations' AND public.is_admin());

COMMENT ON TABLE public.document_folder_permissions IS
  'D-080: per-team_member read grants on a Document Library folder (cascades to descendants; read-only; super_admin-managed).';
COMMENT ON TABLE public.presentation_folder_permissions IS
  'D-080: per-team_member read grants on a Presentation Hub folder (cascades to descendants; read-only; super_admin-managed).';
COMMENT ON FUNCTION public.current_team_member_id() IS
  'D-080: the caller''s team_members.id via profiles.team_member_id, else team_members.auth_user_id; NULL if unlinked.';

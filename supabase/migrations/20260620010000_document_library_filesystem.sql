-- ============================================================================
-- terminalv2 — Document Library File System (PART B of File System v2)
-- Migration: 0031_document_library_filesystem.sql
-- Description: Real folder file-manager. Creates document_folders (recursive
--              tree, trigger-maintained materialized `path`) + document_files
--              (one file per folder, with multilingual `language` + variant
--              `group_id`), RLS keyed off per-folder `is_public`, a PRIVATE
--              `library` storage bucket (served later via signed URLs), and a
--              pg_trgm index for in-library title search.
--
--              NO DATA MIGRATION (D-053): the library starts empty; files are
--              uploaded fresh via the Task-3/4 server actions + UI. The old
--              documents/assets tables are left intact (orphaned, rollback).
--
--              Hardened per the 0031 adversarial review: slug-format CHECK +
--              escaped LIKE (path-corruption fix), FORCE RLS, command-specific
--              write policies, language CHECK, composite pagination indexes,
--              private-folder starter seeds.
--
--              Decisions: D-049 (folder tree, no category), D-050 (trigger path),
--              D-051 (per-folder is_public), D-052 (private bucket + signed URLs),
--              D-053 (no migration), D-054 (language + group_id variant model;
--              language constrained to de/en/tr, group_id intentionally NOT
--              uniquely keyed by language because the model is language×format).
--              Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Role correction (user-confirmed 2026-06-20): dev@airtuerk.de is the email
--    actually used to log in and must be a super_admin alongside bdemir@ (already
--    seeded in 0030). Add to defaults + promote the existing profile. Idempotent.
-- ----------------------------------------------------------------------------
INSERT INTO public.user_role_defaults (email, role)
VALUES ('dev@airtuerk.de', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'dev@airtuerk.de' AND role <> 'super_admin';

-- ----------------------------------------------------------------------------
-- 1. pg_trgm — trigram index support for in-library title search at scale.
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 2. document_folders — recursive tree with materialized slug `path` (D-050).
--    `parent_id` ON DELETE RESTRICT is DELIBERATE: storage.objects are not
--    FK-linked, so a SQL CASCADE would orphan private blobs. Recursive delete +
--    storage GC are the deleteFolder server action's job (super-admin only).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES public.document_folders(id) ON DELETE RESTRICT,  -- NULL = top level
  name        text NOT NULL,
  slug        text NOT NULL,
  path        text NOT NULL,              -- full slug path, trigger-maintained
  is_public   boolean NOT NULL DEFAULT false,
  sort_order  int NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- slug is a single lowercase path segment: no '/', '_', or '%'. This both
  -- normalizes URLs AND makes the path math provably safe (the descendant
  -- rewrite below relies on slugs being LIKE-metacharacter-free).
  CONSTRAINT document_folders_slug_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  -- (parent_id, slug) keeps NESTED siblings unique. NULLs are DISTINCT in a
  -- UNIQUE constraint, so this does NOT cover top-level folders — those are
  -- covered by UNIQUE(path) AND the partial index below.
  UNIQUE (parent_id, slug),
  UNIQUE (path)
);
-- Top-level uniqueness made explicit (parent_id NULL is distinct in UNIQUE above).
CREATE UNIQUE INDEX IF NOT EXISTS document_folders_toplevel_slug_uq
  ON public.document_folders (slug) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS document_folders_path_idx ON public.document_folders (path);
-- Sidebar/child listing orders by sort_order then name within a parent.
CREATE INDEX IF NOT EXISTS document_folders_parent_sort_idx
  ON public.document_folders (parent_id, sort_order, name);

-- ----------------------------------------------------------------------------
-- 3. document_files — one file per folder; multilingual variant model (D-054).
--    storage_path points into the PRIVATE library bucket; there is NO public_url
--    column (files are served through a gated signed-URL route — D-052).
--    `group_id` clusters language/format variants of one logical document and is
--    intentionally a bare uuid (no FK, no per-language uniqueness): a group holds
--    language×format variants (e.g. DE-pdf + DE-docx + EN-pdf). `language` is
--    CHECK-constrained to the supported set (extend with a one-line ALTER later).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- also the storage filename
  folder_id    uuid NOT NULL REFERENCES public.document_folders(id) ON DELETE RESTRICT,
  title        text NOT NULL,
  description  text,
  storage_path text NOT NULL UNIQUE,        -- library/<id>.<ext>
  mime_type    text NOT NULL,
  extension    text NOT NULL,               -- normalized lowercase, no dot
  size_bytes   bigint NOT NULL,
  language     text,                        -- NULL = neutral; else supported set
  group_id     uuid,                        -- variant cluster key; NULL = standalone
  sort_order   int NOT NULL DEFAULT 0,
  uploaded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_files_language_chk
    CHECK (language IS NULL OR language IN ('de', 'en', 'tr'))
);
-- Paginated in-folder listing: WHERE folder_id ORDER BY sort_order, created_at, id.
CREATE INDEX IF NOT EXISTS document_files_folder_sort_idx
  ON public.document_files (folder_id, sort_order, created_at, id);
CREATE INDEX IF NOT EXISTS document_files_group_idx ON public.document_files (group_id);
CREATE INDEX IF NOT EXISTS document_files_title_trgm_idx
  ON public.document_files USING gin (title gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 4. updated_at triggers (reuse set_updated_at() from 0001).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS document_folders_updated_at ON public.document_folders;
CREATE TRIGGER document_folders_updated_at BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS document_files_updated_at ON public.document_files;
CREATE TRIGGER document_files_updated_at BEFORE UPDATE ON public.document_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Path trigger (D-050). BEFORE INSERT/UPDATE OF (slug, parent_id):
--    compute `path` from the parent chain; reject cycles on an actual move.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_document_folder_path()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_path text;
  ancestor    uuid;
  guard       int := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.slug;
  ELSE
    -- Cycle check only when the parent actually changes (a move). Walk the
    -- prospective parent's ancestor chain; if NEW.id appears, reject. guard caps
    -- pathological loops (the tree is acyclic by this very check).
    IF TG_OP = 'UPDATE' AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      ancestor := NEW.parent_id;
      WHILE ancestor IS NOT NULL AND guard < 10000 LOOP
        IF ancestor = NEW.id THEN
          RAISE EXCEPTION 'document_folders cycle: % cannot be moved under its own descendant', NEW.id;
        END IF;
        SELECT parent_id INTO ancestor FROM public.document_folders WHERE id = ancestor;
        guard := guard + 1;
      END LOOP;
    END IF;

    SELECT path INTO parent_path FROM public.document_folders WHERE id = NEW.parent_id;
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'document_folders: parent % has no path', NEW.parent_id;
    END IF;
    NEW.path := parent_path || '/' || NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_folders_set_path ON public.document_folders;
CREATE TRIGGER document_folders_set_path
  BEFORE INSERT OR UPDATE OF slug, parent_id ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_document_folder_path();

-- ----------------------------------------------------------------------------
-- 6. Descendant path rewrite (D-050). AFTER UPDATE OF (slug, parent_id), when
--    the folder's own path changed, rewrite every descendant's path with ONE
--    set-based UPDATE (path is materialized — no recursive CTE needed). The
--    descendant UPDATE touches only `path`, so neither the BEFORE nor this AFTER
--    trigger (both scoped to slug/parent_id) re-fires → no recursion.
--    The LIKE prefix is escaped for defense in depth; the slug CHECK already
--    guarantees no LIKE metacharacters can ever reach `path`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rewrite_document_folder_descendants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.document_folders
    SET path = NEW.path || substr(path, length(OLD.path) + 1)
    WHERE path LIKE replace(replace(replace(OLD.path, '\', '\\'), '%', '\%'), '_', '\_') || '/%' ESCAPE '\';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS document_folders_rewrite_descendants ON public.document_folders;
CREATE TRIGGER document_folders_rewrite_descendants
  AFTER UPDATE OF slug, parent_id ON public.document_folders
  FOR EACH ROW WHEN (NEW.path IS DISTINCT FROM OLD.path)
  EXECUTE FUNCTION public.rewrite_document_folder_descendants();

-- ----------------------------------------------------------------------------
-- 7. RLS (D-051). Anon/users read only public folders + their files; admins
--    (admin OR super_admin via is_admin()) read everything. Writes are admin
--    (super-admin-only ops — folder delete, visibility toggle — additionally
--    enforced in the server action). FORCE so the policy applies even to the
--    table owner / SECURITY DEFINER callers; service_role still bypasses RLS.
--    Write policies are command-specific so USING never participates in SELECT
--    (the FOR SELECT policy is the sole read grant). Login gate later = change
--    the SELECT clause only.
-- ----------------------------------------------------------------------------
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.document_files   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_files   FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_folders_select        ON public.document_folders;
DROP POLICY IF EXISTS document_folders_write_admin   ON public.document_folders;  -- old FOR ALL (re-run safety)
DROP POLICY IF EXISTS document_folders_insert_admin  ON public.document_folders;
DROP POLICY IF EXISTS document_folders_update_admin  ON public.document_folders;
DROP POLICY IF EXISTS document_folders_delete_admin  ON public.document_folders;
CREATE POLICY document_folders_select ON public.document_folders
  FOR SELECT USING (is_public OR public.is_admin());
CREATE POLICY document_folders_insert_admin ON public.document_folders
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY document_folders_update_admin ON public.document_folders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY document_folders_delete_admin ON public.document_folders
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS document_files_select        ON public.document_files;
DROP POLICY IF EXISTS document_files_write_admin   ON public.document_files;  -- old FOR ALL (re-run safety)
DROP POLICY IF EXISTS document_files_insert_admin  ON public.document_files;
DROP POLICY IF EXISTS document_files_update_admin  ON public.document_files;
DROP POLICY IF EXISTS document_files_delete_admin  ON public.document_files;
CREATE POLICY document_files_select ON public.document_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.document_folders f
      WHERE f.id = public.document_files.folder_id AND (f.is_public OR public.is_admin())
    )
  );
CREATE POLICY document_files_insert_admin ON public.document_files
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY document_files_update_admin ON public.document_files
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY document_files_delete_admin ON public.document_files
  FOR DELETE TO authenticated USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Private `library` storage bucket (D-052). NOT public — files are served
--    through a server route that mints short-TTL signed URLs after a role check.
--    Admin-only object policies; no public read policy (signed URLs are minted
--    with the service role, which bypasses RLS). 15 MB limit is intentional:
--    this library holds contracts/forms/mandates (small); master decks live in
--    the Presentation Hub. Extend the allowlist/limit with a one-line UPDATE.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'library', 'library', false, 15728640,  -- 15 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'text/plain',
    'application/zip', 'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "library_read_admin"   ON storage.objects;
CREATE POLICY "library_read_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'library' AND public.is_admin());

DROP POLICY IF EXISTS "library_write_admin"  ON storage.objects;
CREATE POLICY "library_write_admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'library' AND public.is_admin());

DROP POLICY IF EXISTS "library_update_admin" ON storage.objects;
CREATE POLICY "library_update_admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'library' AND public.is_admin())
  WITH CHECK (bucket_id = 'library' AND public.is_admin());

DROP POLICY IF EXISTS "library_delete_admin" ON storage.objects;
CREATE POLICY "library_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'library' AND public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Starter top-level folders (optional UX seed) so the first UI load isn't a
--    blank screen. `path` is populated by the BEFORE INSERT trigger (= slug for
--    top level), so ON CONFLICT (path) is safe. Business Development + Westhafen
--    are public; Finance + HR are PRIVATE (sensitive dept names not exposed to
--    anon pre-login-gate) — a super-admin flips visibility from the UI later.
-- ----------------------------------------------------------------------------
INSERT INTO public.document_folders (name, slug, is_public, sort_order) VALUES
  ('Business Development', 'business-development', true,  0),
  ('Finance',              'finance',              false, 1),
  ('Westhafen',            'westhafen',            true,  2),
  ('HR',                   'hr',                   false, 3)
ON CONFLICT (path) DO NOTHING;

COMMENT ON TABLE public.document_folders IS 'Document Library folder tree (File System v2); materialized slug path, per-folder is_public.';
COMMENT ON TABLE public.document_files   IS 'Document Library files (File System v2); one folder per file, multilingual language + group_id variant model; stored in the private library bucket.';

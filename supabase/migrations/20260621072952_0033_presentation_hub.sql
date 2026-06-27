-- ============================================================================
-- terminalv2 — Presentation Hub File System
-- Migration: 0033_presentation_hub.sql
-- Parallel zur Document Library (0031): rekursiver Ordnerbaum mit
-- trigger-gepflegtem materialisierten `path`, aber komplett getrennt:
-- eigene Tabellen, eigener privater Bucket `presentations`, eigene RLS.
-- Kernunterschiede: KEIN is_public (login-only), Slide-Pipeline-Spalten +
-- search_vector, Versions-History, Featured-Surface, Department-Tags,
-- View-Tracking. ON DELETE RESTRICT (wie 0031) gegen verwaiste Blobs.
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. presentation_folders --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presentation_folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES public.presentation_folders(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  slug        text NOT NULL,
  path        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT presentation_folders_slug_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  UNIQUE (parent_id, slug),
  UNIQUE (path)
);
CREATE UNIQUE INDEX IF NOT EXISTS presentation_folders_toplevel_slug_uq
  ON public.presentation_folders (slug) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS presentation_folders_path_idx
  ON public.presentation_folders (path);
CREATE INDEX IF NOT EXISTS presentation_folders_parent_sort_idx
  ON public.presentation_folders (parent_id, sort_order, name);

-- 2. presentation_files ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presentation_files (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id      uuid NOT NULL REFERENCES public.presentation_folders(id) ON DELETE RESTRICT,
  title          text NOT NULL,
  description    text,
  storage_path   text NOT NULL UNIQUE,         -- presentations/<id>/source.<ext>
  file_type      text NOT NULL,                -- lowercase ext: pdf|ppt|pptx|pps|ppsx|jpg|png|webp
  mime_type      text NOT NULL,
  size_bytes     bigint NOT NULL,
  language       text,                         -- NULL = neutral; sonst de/en/tr
  group_id       uuid,                         -- Variant-Cluster; NULL = standalone
  thumbnail_path text,                         -- erste Seite als WebP (Stufe 3)
  slide_count    int  NOT NULL DEFAULT 0,
  slide_paths    text[] NOT NULL DEFAULT '{}', -- alle Seiten als WebP (Player + Hover)
  slide_text     text,                         -- OCR-Volltext (Stufe 3)
  search_vector  tsvector GENERATED ALWAYS AS (
                   to_tsvector('simple',
                     coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(slide_text,''))
                 ) STORED,
  is_featured    boolean NOT NULL DEFAULT false,
  featured_until timestamptz,
  parent_file_id uuid REFERENCES public.presentation_files(id) ON DELETE SET NULL,  -- Versions-Kette: NEUE Version -> Vorgaenger (alte, archivierte Version). SET NULL, damit Loeschen einer alten Version die Live-Zeile nicht bricht.
  is_archived    boolean NOT NULL DEFAULT false,
  sort_order     int  NOT NULL DEFAULT 0,
  uploaded_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT presentation_files_language_chk
    CHECK (language IS NULL OR language IN ('de','en','tr'))
);
CREATE INDEX IF NOT EXISTS presentation_files_folder_sort_idx
  ON public.presentation_files (folder_id, sort_order, created_at, id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS presentation_files_group_idx
  ON public.presentation_files (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS presentation_files_featured_idx
  ON public.presentation_files (featured_until) WHERE is_featured;
CREATE INDEX IF NOT EXISTS presentation_files_versions_idx
  ON public.presentation_files (parent_file_id) WHERE parent_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS presentation_files_search_idx
  ON public.presentation_files USING gin (search_vector);
CREATE INDEX IF NOT EXISTS presentation_files_title_trgm_idx
  ON public.presentation_files USING gin (title gin_trgm_ops);

-- 3. Tags + Junction -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presentation_tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  display_name text NOT NULL,
  color        text,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.presentation_file_tags (
  file_id uuid NOT NULL REFERENCES public.presentation_files(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.presentation_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, tag_id)
);
CREATE INDEX IF NOT EXISTS presentation_file_tags_tag_idx
  ON public.presentation_file_tags (tag_id);

-- 4. View-Tracking ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presentation_views (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id          uuid NOT NULL REFERENCES public.presentation_files(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at        timestamptz NOT NULL DEFAULT now(),
  duration_seconds int
);
CREATE INDEX IF NOT EXISTS presentation_views_file_idx
  ON public.presentation_views (file_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS presentation_views_user_idx
  ON public.presentation_views (user_id, viewed_at DESC);

-- 5. updated_at Trigger (reuse set_updated_at() aus 0001) -------------------
DROP TRIGGER IF EXISTS presentation_folders_updated_at ON public.presentation_folders;
CREATE TRIGGER presentation_folders_updated_at BEFORE UPDATE ON public.presentation_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS presentation_files_updated_at ON public.presentation_files;
CREATE TRIGGER presentation_files_updated_at BEFORE UPDATE ON public.presentation_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Path-Trigger (BEFORE INSERT/UPDATE OF slug,parent_id; Cycle-Check) -----
CREATE OR REPLACE FUNCTION public.set_presentation_folder_path()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_path text; ancestor uuid; guard int := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.slug;
  ELSE
    IF TG_OP = 'UPDATE' AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      ancestor := NEW.parent_id;
      WHILE ancestor IS NOT NULL AND guard < 10000 LOOP
        IF ancestor = NEW.id THEN
          RAISE EXCEPTION 'presentation_folders cycle: % cannot be moved under its own descendant', NEW.id;
        END IF;
        SELECT parent_id INTO ancestor FROM public.presentation_folders WHERE id = ancestor;
        guard := guard + 1;
      END LOOP;
    END IF;
    SELECT path INTO parent_path FROM public.presentation_folders WHERE id = NEW.parent_id;
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'presentation_folders: parent % has no path', NEW.parent_id;
    END IF;
    NEW.path := parent_path || '/' || NEW.slug;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS presentation_folders_set_path ON public.presentation_folders;
CREATE TRIGGER presentation_folders_set_path
  BEFORE INSERT OR UPDATE OF slug, parent_id ON public.presentation_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_presentation_folder_path();

-- 7. Descendant-Path-Rewrite (AFTER UPDATE OF slug,parent_id) ---------------
CREATE OR REPLACE FUNCTION public.rewrite_presentation_folder_descendants()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.presentation_folders
    SET path = NEW.path || substr(path, length(OLD.path) + 1)
    WHERE path LIKE replace(replace(replace(OLD.path, '\', '\\'), '%', '\%'), '_', '\_') || '/%' ESCAPE '\';
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS presentation_folders_rewrite_descendants ON public.presentation_folders;
CREATE TRIGGER presentation_folders_rewrite_descendants
  AFTER UPDATE OF slug, parent_id ON public.presentation_folders
  FOR EACH ROW WHEN (NEW.path IS DISTINCT FROM OLD.path)
  EXECUTE FUNCTION public.rewrite_presentation_folder_descendants();

-- 8. RLS — login-only, alle authenticated lesen, nur is_admin() schreibt ----
ALTER TABLE public.presentation_folders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_folders   FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.presentation_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_files     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.presentation_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_tags      FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.presentation_file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_file_tags FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.presentation_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_views     FORCE  ROW LEVEL SECURITY;

-- folders
DROP POLICY IF EXISTS presentation_folders_select       ON public.presentation_folders;
DROP POLICY IF EXISTS presentation_folders_insert_admin ON public.presentation_folders;
DROP POLICY IF EXISTS presentation_folders_update_admin ON public.presentation_folders;
DROP POLICY IF EXISTS presentation_folders_delete_admin ON public.presentation_folders;
CREATE POLICY presentation_folders_select ON public.presentation_folders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY presentation_folders_insert_admin ON public.presentation_folders
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY presentation_folders_update_admin ON public.presentation_folders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY presentation_folders_delete_admin ON public.presentation_folders
  FOR DELETE TO authenticated USING (public.is_admin());

-- files
DROP POLICY IF EXISTS presentation_files_select       ON public.presentation_files;
DROP POLICY IF EXISTS presentation_files_insert_admin ON public.presentation_files;
DROP POLICY IF EXISTS presentation_files_update_admin ON public.presentation_files;
DROP POLICY IF EXISTS presentation_files_delete_admin ON public.presentation_files;
CREATE POLICY presentation_files_select ON public.presentation_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY presentation_files_insert_admin ON public.presentation_files
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY presentation_files_update_admin ON public.presentation_files
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY presentation_files_delete_admin ON public.presentation_files
  FOR DELETE TO authenticated USING (public.is_admin());

-- tags
DROP POLICY IF EXISTS presentation_tags_select       ON public.presentation_tags;
DROP POLICY IF EXISTS presentation_tags_insert_admin ON public.presentation_tags;
DROP POLICY IF EXISTS presentation_tags_update_admin ON public.presentation_tags;
DROP POLICY IF EXISTS presentation_tags_delete_admin ON public.presentation_tags;
CREATE POLICY presentation_tags_select ON public.presentation_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY presentation_tags_insert_admin ON public.presentation_tags
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY presentation_tags_update_admin ON public.presentation_tags
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY presentation_tags_delete_admin ON public.presentation_tags
  FOR DELETE TO authenticated USING (public.is_admin());

-- file_tags
DROP POLICY IF EXISTS presentation_file_tags_select       ON public.presentation_file_tags;
DROP POLICY IF EXISTS presentation_file_tags_insert_admin ON public.presentation_file_tags;
DROP POLICY IF EXISTS presentation_file_tags_update_admin ON public.presentation_file_tags;
DROP POLICY IF EXISTS presentation_file_tags_delete_admin ON public.presentation_file_tags;
CREATE POLICY presentation_file_tags_select ON public.presentation_file_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY presentation_file_tags_insert_admin ON public.presentation_file_tags
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY presentation_file_tags_update_admin ON public.presentation_file_tags
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY presentation_file_tags_delete_admin ON public.presentation_file_tags
  FOR DELETE TO authenticated USING (public.is_admin());

-- views — nur admin liest; Insert/Update via service-role Server-Action
DROP POLICY IF EXISTS presentation_views_select_admin ON public.presentation_views;
CREATE POLICY presentation_views_select_admin ON public.presentation_views
  FOR SELECT TO authenticated USING (public.is_admin());

-- 9. Privater Bucket `presentations` (25 MB), Pattern wie 0031 -------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentations', 'presentations', false, 26214400,  -- 25 MB
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "presentations_read_auth"    ON storage.objects;
CREATE POLICY "presentations_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'presentations');
DROP POLICY IF EXISTS "presentations_write_admin"  ON storage.objects;
CREATE POLICY "presentations_write_admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'presentations' AND public.is_admin());
DROP POLICY IF EXISTS "presentations_update_admin" ON storage.objects;
CREATE POLICY "presentations_update_admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'presentations' AND public.is_admin())
  WITH CHECK (bucket_id = 'presentations' AND public.is_admin());
DROP POLICY IF EXISTS "presentations_delete_admin" ON storage.objects;
CREATE POLICY "presentations_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'presentations' AND public.is_admin());

-- 10. Seed Default-Department-Tags (KEINE Seed-Folder) ---------------------
INSERT INTO public.presentation_tags (name, display_name, sort_order) VALUES
  ('business-development', 'Business Development', 0),
  ('sales',               'Sales',                1),
  ('marketing',           'Marketing',            2),
  ('hr',                  'HR',                   3),
  ('operations',          'Operations',           4)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.presentation_folders IS 'Presentation Hub folder tree; materialized slug path; login-only (no is_public).';
COMMENT ON TABLE public.presentation_files   IS 'Presentation Hub files; slide pipeline (slide_paths/slide_text/search_vector), versions (parent_file_id/is_archived), featured surface.';
COMMENT ON COLUMN public.presentation_files.parent_file_id IS 'Versions-Kette: zeigt von der neuen Version auf ihren Vorgaenger (alte, archivierte Version). ON DELETE SET NULL, damit das Loeschen einer alten Version die Live-Zeile nicht bricht.';

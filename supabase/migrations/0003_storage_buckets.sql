-- ============================================================================
-- terminalv2 — Storage buckets
-- Migration: 0003_storage_buckets.sql
-- Description: Creates 4 storage buckets with public-read access and
--              admin-only write policies.
-- ============================================================================

-- Create buckets (idempotent via ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('images',    'images',    true, 52428800,   -- 50 MB per file
   ARRAY['image/png','image/jpeg','image/webp','image/svg+xml','image/gif','image/avif']),
  ('documents', 'documents', true, 104857600,  -- 100 MB per file
   ARRAY['application/pdf','application/zip','application/x-zip-compressed',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('videos',    'videos',    true, 524288000,  -- 500 MB per file
   ARRAY['video/mp4','video/webm','image/jpeg','image/png']),  -- last two for posters
  ('fonts',     'fonts',     true, 5242880,    -- 5 MB per file
   ARRAY['font/woff','font/woff2','application/font-woff','application/font-woff2',
         'application/octet-stream'])  -- some fonts come with this mime
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Storage policies
-- Public can read all buckets; admin can write.
-- ----------------------------------------------------------------------------

-- Read policies (public)
CREATE POLICY "images_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "documents_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "videos_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "fonts_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fonts');

-- Write policies (admin only via the public.is_admin() function from 0002)
CREATE POLICY "images_write_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND public.is_admin());

CREATE POLICY "images_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'images' AND public.is_admin())
  WITH CHECK (bucket_id = 'images' AND public.is_admin());

CREATE POLICY "images_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'images' AND public.is_admin());

CREATE POLICY "documents_write_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "documents_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "documents_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "videos_write_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND public.is_admin());

CREATE POLICY "videos_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos' AND public.is_admin())
  WITH CHECK (bucket_id = 'videos' AND public.is_admin());

CREATE POLICY "videos_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND public.is_admin());

CREATE POLICY "fonts_write_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fonts' AND public.is_admin());

CREATE POLICY "fonts_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fonts' AND public.is_admin())
  WITH CHECK (bucket_id = 'fonts' AND public.is_admin());

CREATE POLICY "fonts_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fonts' AND public.is_admin());

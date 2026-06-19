-- ============================================================================
-- terminalv2 — Confluence raw snapshot tables (intelligence layer, etappe 1a)
-- Migration: 0025_confluence_raw_snapshot.sql
-- Description: Own-the-data layer for WikiOperativ. The confluence-snapshot
--              edge function pulls ~82 pages + comments + attachment manifest
--              into these tables. After this snapshot the Confluence API is
--              no longer a runtime dependency for downstream consumers.
--              No pgvector, no embeddings, no chunking — that is etappe 1b.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- confluence_raw — one row per Confluence page
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.confluence_raw (
  page_id            text PRIMARY KEY,
  space_key          text NOT NULL,
  title              text NOT NULL,
  kanal              text,                  -- konti|xml|low|b2b|mietwagen|veranstalter
  parent_id          text,
  ancestors          jsonb NOT NULL DEFAULT '[]'::jsonb,
  labels             jsonb NOT NULL DEFAULT '[]'::jsonb,
  body_storage       text,                  -- canonical XHTML (NOT stripped)
  body_view          text,                  -- rendered HTML (fallback)
  body_text          text,                  -- stripped plaintext (convenience)
  char_count         int,
  restrictions       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {} = no restrictions
  created_by         text,
  created_at         timestamptz,
  version            int,
  last_modified      timestamptz,
  last_modified_by   text,
  snapshot_at        timestamptz NOT NULL DEFAULT now(),
  is_deleted         boolean NOT NULL DEFAULT false,
  source_url         text
);

CREATE INDEX IF NOT EXISTS confluence_raw_kanal_idx       ON public.confluence_raw (kanal);
CREATE INDEX IF NOT EXISTS confluence_raw_parent_idx      ON public.confluence_raw (parent_id);
CREATE INDEX IF NOT EXISTS confluence_raw_last_mod_idx    ON public.confluence_raw (last_modified DESC);
CREATE INDEX IF NOT EXISTS confluence_raw_is_deleted_idx  ON public.confluence_raw (is_deleted) WHERE is_deleted = false;

COMMENT ON TABLE  public.confluence_raw IS
  'Raw snapshot of WikiOperativ pages (etappe 1a). Source-of-truth for the intelligence layer.';
COMMENT ON COLUMN public.confluence_raw.restrictions IS
  'Confluence per-page restrictions (read/update). Empty object = no restrictions. Basis for later content-level RLS.';
COMMENT ON COLUMN public.confluence_raw.body_storage IS
  'Canonical Confluence XHTML body. Preserved for re-chunking without re-fetching the API.';

-- ----------------------------------------------------------------------------
-- confluence_attachments — one row per attachment (manifest + optional extract)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.confluence_attachments (
  attachment_id      text PRIMARY KEY,
  page_id            text NOT NULL REFERENCES public.confluence_raw(page_id) ON DELETE CASCADE,
  filename           text,
  media_type         text,
  file_size          bigint,
  is_text_relevant   boolean NOT NULL DEFAULT false,
  storage_path       text,                  -- path inside confluence-attachments bucket
  extracted_text     text,
  download_url       text,                  -- original Confluence download URL
  snapshot_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS confluence_att_page_idx       ON public.confluence_attachments (page_id);
CREATE INDEX IF NOT EXISTS confluence_att_relevant_idx   ON public.confluence_attachments (is_text_relevant) WHERE is_text_relevant = true;

COMMENT ON TABLE public.confluence_attachments IS
  'Attachment manifest for confluence_raw. Images: metadata only. PDF/Office: text-relevant, downloaded to bucket.';

-- ----------------------------------------------------------------------------
-- confluence_comments — page comments (footer + inline)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.confluence_comments (
  comment_id         text PRIMARY KEY,
  page_id            text NOT NULL REFERENCES public.confluence_raw(page_id) ON DELETE CASCADE,
  author             text,
  body_text          text,
  created_at         timestamptz,
  comment_type       text NOT NULL,         -- 'footer' | 'inline'
  snapshot_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS confluence_comments_page_idx ON public.confluence_comments (page_id);

COMMENT ON TABLE public.confluence_comments IS
  'Confluence page comments (footer + inline). Author is display name, not auth.uid.';

-- ----------------------------------------------------------------------------
-- RLS — restrictive default. authenticated may SELECT, only admins write.
-- Edge functions use the service role which bypasses RLS by design.
-- ----------------------------------------------------------------------------
ALTER TABLE public.confluence_raw         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confluence_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confluence_comments    ENABLE ROW LEVEL SECURITY;

-- confluence_raw
CREATE POLICY confluence_raw_select_auth ON public.confluence_raw
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY confluence_raw_modify_admin ON public.confluence_raw
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- confluence_attachments
CREATE POLICY confluence_att_select_auth ON public.confluence_attachments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY confluence_att_modify_admin ON public.confluence_attachments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- confluence_comments
CREATE POLICY confluence_comments_select_auth ON public.confluence_comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY confluence_comments_modify_admin ON public.confluence_comments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Storage bucket: confluence-attachments (private, text-relevant docs only)
-- Separate from images/documents/videos/fonts and the future rag-knowledge bucket.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'confluence-attachments',
  'confluence-attachments',
  false,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated read, admin write.
CREATE POLICY "confluence_attachments_read_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'confluence-attachments');

CREATE POLICY "confluence_attachments_write_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'confluence-attachments' AND public.is_admin());

CREATE POLICY "confluence_attachments_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'confluence-attachments' AND public.is_admin())
  WITH CHECK (bucket_id = 'confluence-attachments' AND public.is_admin());

CREATE POLICY "confluence_attachments_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'confluence-attachments' AND public.is_admin());

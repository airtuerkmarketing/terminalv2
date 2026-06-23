-- ====================================================================
-- RAG Foundation: pgvector + 6 tables + RLS + indexes
-- Decision: D-058 (RAG-airtuerk V2 Foundation)
-- Plan: terminal/01-FOUNDATION Atomic Prompt 1.3
-- FK target columns verified against live schema 2026-06-23:
--   confluence_raw.page_id (text, PK), confluence_attachments.attachment_id
--   (text, PK), brands.id / pages.id / blocks.id (uuid, PK). set_updated_at,
--   is_admin, is_super_admin all pre-exist — referenced, never recreated.
-- ====================================================================

-- 1) pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ====================================================================
-- LAYER 1: company_context (manually seeded identity)
-- ====================================================================
CREATE TABLE public.company_context (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL,
  topic        text NOT NULL,
  content      text NOT NULL,
  priority     integer NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  language     text NOT NULL DEFAULT 'de',
  embedding    vector(1024),
  metadata     jsonb NOT NULL DEFAULT '{}',
  content_hash text GENERATED ALWAYS AS (md5(content)) STORED,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  is_active    boolean NOT NULL DEFAULT true,
  UNIQUE(content_hash)
);

CREATE INDEX company_context_embedding_idx
  ON public.company_context USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX company_context_priority_active_idx
  ON public.company_context(priority, is_active) WHERE is_active = true;
CREATE INDEX company_context_category_idx
  ON public.company_context(category) WHERE is_active = true;

COMMENT ON TABLE public.company_context IS
  'Manually-seeded airtuerk identity. Priority-1 entries are ALWAYS injected into RAG prompts.';

-- ====================================================================
-- LAYER 2: confluence_chunks (Operations knowledge)
-- C10 FIX: content_hash includes source IDs for true idempotency
-- ====================================================================
CREATE TABLE public.confluence_chunks (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id       text REFERENCES public.confluence_raw(page_id) ON DELETE CASCADE,
  attachment_id text REFERENCES public.confluence_attachments(attachment_id) ON DELETE CASCADE,
  chunk_index   integer NOT NULL,
  content       text NOT NULL,
  token_count   integer,
  embedding     vector(1024),
  metadata      jsonb NOT NULL DEFAULT '{}',
  source_type   text NOT NULL DEFAULT 'page'
    CHECK (source_type IN ('page', 'pdf', 'office', 'correction')),
  content_hash  text GENERATED ALWAYS AS (
    md5(content || '|' || COALESCE(page_id, '') || '|' || COALESCE(attachment_id, ''))
  ) STORED,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_hash)
);

CREATE INDEX confluence_chunks_embedding_idx
  ON public.confluence_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX confluence_chunks_metadata_gin_idx
  ON public.confluence_chunks USING gin(metadata);
CREATE INDEX confluence_chunks_content_trgm_idx
  ON public.confluence_chunks USING gin (content gin_trgm_ops);
CREATE INDEX confluence_chunks_page_idx
  ON public.confluence_chunks(page_id) WHERE page_id IS NOT NULL;
CREATE INDEX confluence_chunks_attachment_idx
  ON public.confluence_chunks(attachment_id) WHERE attachment_id IS NOT NULL;
CREATE INDEX confluence_chunks_source_type_idx
  ON public.confluence_chunks(source_type);

COMMENT ON TABLE public.confluence_chunks IS
  'Chunked + embedded Confluence content. Hybrid search via vector + pg_trgm. content_hash includes source IDs so same content from different pages stays distinct.';

-- ====================================================================
-- LAYER 3: brand_chunks (Structured brand knowledge)
-- C10 FIX: content_hash includes source IDs
-- ====================================================================
CREATE TABLE public.brand_chunks (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brand_id     uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  page_id      uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  block_id     uuid REFERENCES public.blocks(id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL,
  content      text NOT NULL,
  token_count  integer,
  embedding    vector(1024),
  metadata     jsonb NOT NULL DEFAULT '{}',
  content_hash text GENERATED ALWAYS AS (
    md5(
      content || '|' ||
      COALESCE(brand_id::text, '') || '|' ||
      COALESCE(page_id::text, '') || '|' ||
      COALESCE(block_id::text, '')
    )
  ) STORED,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_hash)
);

CREATE INDEX brand_chunks_embedding_idx
  ON public.brand_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX brand_chunks_brand_idx
  ON public.brand_chunks(brand_id);

COMMENT ON TABLE public.brand_chunks IS
  'Chunked brand-knowledge: 15 brands + 55 pages + 43 blocks. Source of brand-related answers.';

-- ====================================================================
-- AI Chat Sessions
-- ====================================================================
CREATE TABLE public.ai_chat_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_chat_sessions_user_idx
  ON public.ai_chat_sessions(user_id, created_at DESC);

-- ====================================================================
-- AI Chat Messages (with retrieval logging)
-- user_feedback CHECK uses NULL OR IN pattern (NULL never matches IN)
-- ====================================================================
CREATE TABLE public.ai_chat_messages (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id       uuid REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role             text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content          text NOT NULL,
  retrieved_chunks jsonb NOT NULL DEFAULT '[]',
  model            text,
  tokens_in        integer,
  tokens_out       integer,
  latency_ms       integer,
  user_feedback    text CHECK (
    user_feedback IS NULL OR user_feedback IN ('helpful', 'not_helpful')
  ),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_chat_messages_session_idx
  ON public.ai_chat_messages(session_id, created_at);
CREATE INDEX ai_chat_messages_feedback_idx
  ON public.ai_chat_messages(user_feedback) WHERE user_feedback IS NOT NULL;

-- ====================================================================
-- LAYER 4: ai_corrections (Learnability)
-- ====================================================================
CREATE TABLE public.ai_corrections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL,
  message_id          bigint REFERENCES public.ai_chat_messages(id) ON DELETE SET NULL,
  original_question   text NOT NULL,
  original_answer     text NOT NULL,
  retrieved_chunks    jsonb NOT NULL DEFAULT '[]',
  proposed_correction text NOT NULL,
  correction_type     text NOT NULL CHECK (correction_type IN (
    'factual_error', 'missing_info', 'outdated', 'context_wrong'
  )),
  user_reference      text,
  submitted_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'edited_approved', 'rejected'
  )),
  reviewed_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  reviewer_notes      text,
  final_content       text,
  applied_to_chunk_id bigint REFERENCES public.confluence_chunks(id) ON DELETE SET NULL,
  applied_at          timestamptz
);

CREATE INDEX ai_corrections_status_idx
  ON public.ai_corrections(status, submitted_at DESC);
CREATE INDEX ai_corrections_submitted_by_idx
  ON public.ai_corrections(submitted_by);
CREATE INDEX ai_corrections_reviewed_by_idx
  ON public.ai_corrections(reviewed_by) WHERE reviewed_by IS NOT NULL;

COMMENT ON TABLE public.ai_corrections IS
  'User-submitted corrections to AI answers. Reviewed by admin. Approved corrections become chunks (source_type=correction).';

-- ====================================================================
-- RLS — Repository idiom: TO authenticated USING (true) for reads,
-- writes gated by is_admin() / is_super_admin().
-- ====================================================================

-- company_context
ALTER TABLE public.company_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_context FORCE ROW LEVEL SECURITY;

CREATE POLICY "company_context_select"
  ON public.company_context FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "company_context_admin_insert"
  ON public.company_context FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "company_context_admin_update"
  ON public.company_context FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR public.is_super_admin())
  WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "company_context_admin_delete"
  ON public.company_context FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- confluence_chunks (read-only for authenticated, writes only via service role)
ALTER TABLE public.confluence_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confluence_chunks FORCE ROW LEVEL SECURITY;

CREATE POLICY "confluence_chunks_select"
  ON public.confluence_chunks FOR SELECT
  TO authenticated
  USING (true);

-- brand_chunks (read-only for authenticated)
ALTER TABLE public.brand_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_chunks FORCE ROW LEVEL SECURITY;

CREATE POLICY "brand_chunks_select"
  ON public.brand_chunks FOR SELECT
  TO authenticated
  USING (true);

-- ai_chat_sessions (own + super_admin)
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own_select"
  ON public.ai_chat_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "sessions_own_insert"
  ON public.ai_chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_own_update"
  ON public.ai_chat_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ai_chat_messages (own + super_admin)
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "messages_own_select"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE id = ai_chat_messages.session_id
        AND (user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "messages_own_feedback_update"
  ON public.ai_chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE id = ai_chat_messages.session_id AND user_id = auth.uid()
    )
  );

-- ai_corrections
ALTER TABLE public.ai_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_corrections FORCE ROW LEVEL SECURITY;

CREATE POLICY "corrections_own_select"
  ON public.ai_corrections FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.is_admin()
    OR public.is_super_admin()
  );

CREATE POLICY "corrections_own_insert"
  ON public.ai_corrections FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "corrections_admin_review"
  ON public.ai_corrections FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR public.is_super_admin())
  WITH CHECK (public.is_admin() OR public.is_super_admin());

-- ====================================================================
-- Updated_at triggers (C7 FIX: reuse EXISTING public.set_updated_at,
-- do NOT recreate — it already exists with pinned search_path on 11 tables)
-- ====================================================================

CREATE TRIGGER company_context_set_updated_at
  BEFORE UPDATE ON public.company_context
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ai_chat_sessions_set_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

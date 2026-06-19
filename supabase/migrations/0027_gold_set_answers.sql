-- ============================================================================
-- terminalv2 — Gold-Set validation quiz (intelligence layer)
-- Migration: 0027_gold_set_answers.sql
-- Description: Backs the internal Gold-Set validation form under Presentation Hub
--              (/presentation-hub/gold-set, hardcoded component_key='gold-set').
--              The Service-Center team answers 28 free-text questions; one submit
--              writes 28 rows sharing a client-generated session_id. Purpose is
--              VALIDATION of the RAG gold-set (not training, not embeddings).
--              No pgvector, no chunking. Chat-side reads via the service role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- gold_set_answers — one row per (question × submission)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gold_set_answers (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  frage_nr      int NOT NULL,
  frage_text    text NOT NULL,
  antwort       text,                    -- free text from the team (NULL = left blank)
  bearbeiter    text,                    -- name/initials (free text, optional)
  session_id    text,                    -- one client-generated UUID per submission
  erstellt_am   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gold_set_answers_session_idx ON public.gold_set_answers (session_id);
CREATE INDEX IF NOT EXISTS gold_set_answers_created_idx ON public.gold_set_answers (erstellt_am DESC);

COMMENT ON TABLE public.gold_set_answers IS
  'Internal Gold-Set validation quiz answers (Presentation Hub). 28 free-text rows per submission, grouped by session_id. Validation of the RAG gold-set — not training data.';
COMMENT ON COLUMN public.gold_set_answers.session_id IS
  'Client-generated UUID shared by all rows of one submission. Group by this to reconstruct a single person''s run.';
COMMENT ON COLUMN public.gold_set_answers.antwort IS
  'Free text exactly as typed. NULL = the field was left blank. "weiß ich nicht" is a valid, expected answer (esp. Q27/Q28, deliberately not in the source data).';

-- ----------------------------------------------------------------------------
-- RLS — anon may INSERT (intranet form, no login), only authenticated may SELECT.
-- The service role bypasses RLS, so the chat-side MCP read sees everything.
-- ----------------------------------------------------------------------------
ALTER TABLE public.gold_set_answers ENABLE ROW LEVEL SECURITY;

-- The team submits without logging in → anon + authenticated may insert.
-- No USING clause on INSERT; WITH CHECK (true) accepts any row.
CREATE POLICY gold_set_answers_insert_public ON public.gold_set_answers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Reading answers back is NOT public: only authenticated sessions (and the
-- service role, which bypasses RLS) can SELECT. anon has no SELECT policy, so
-- anon reads return zero rows even though anon can insert.
CREATE POLICY gold_set_answers_select_auth ON public.gold_set_answers
  FOR SELECT TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Page row — sub-page of Presentation Hub, dispatched to the hardcoded
-- 'gold-set' component in renderPage() (like asset-library / document-library).
-- PUBLISHED (not draft): the team must reach it without login, and the public
-- `pages` RLS policy only exposes status='published' rows to the anon key.
-- Idempotent via ON CONFLICT on the unique full_path.
-- ----------------------------------------------------------------------------
INSERT INTO public.pages
  (parent_id, brand_id, slug, full_path, sort_order, title, meta_title, meta_description, rendering_mode, component_key, status)
SELECT
  id, brand_id, 'gold-set', '/presentation-hub/gold-set', 10,
  'Gold-Set Validierung',
  'Gold-Set Validierung',
  'Interne Validierung des RAG-Gold-Sets — 28 Fragen, Freitext-Antwort.',
  'hardcoded', 'gold-set', 'published'
FROM public.pages
WHERE full_path = '/presentation-hub'
ON CONFLICT (full_path) DO UPDATE
  SET rendering_mode = 'hardcoded',
      component_key   = 'gold-set',
      status          = 'published';

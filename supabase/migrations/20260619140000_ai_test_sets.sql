-- ============================================================================
-- terminalv2 — Three AI TEST review sets (intelligence layer)
-- Migration: 0029_ai_test_sets.sql
-- Description: The single Gold-Set review page (migrations 0027/0028) becomes
--              THREE diagnostic review pages under Presentation Hub — same
--              concept (Vorschlag + richtig/falsch + Korrektur-Pflicht +
--              sicher/unsicher), different question sets:
--                AI TEST 1 — Airlines (DE, faktisch)        · ai_test_1
--                AI TEST 2 — Mietwagen + cross-lingual DE→TR · ai_test_2
--                AI TEST 3 — Prozesse / FAQ / Spezialfälle   · ai_test_3
--              All three write to the SAME table (gold_set_answers) with a new
--              test_set column, so each test's runs can be evaluated separately.
--              The legacy /presentation-hub/gold-set page row is REPURPOSED into
--              ai-test-1 (the old URL dies — acknowledged OK). Two new rows are
--              added for ai-test-2 / ai-test-3.
--              Still pure VALIDATION — no pgvector, no chunking, no embeddings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Phase 1 — test_set column
-- One value per submission row, telling which AI TEST it belongs to.
-- DEFAULT 'ai_test_1' so any pre-existing free-text/review rows are attributed
-- to the original (Airlines) set. The app always writes test_set explicitly.
-- ----------------------------------------------------------------------------
ALTER TABLE public.gold_set_answers
  ADD COLUMN IF NOT EXISTS test_set text NOT NULL DEFAULT 'ai_test_1';

COMMENT ON COLUMN public.gold_set_answers.test_set IS
  'Which AI TEST set this row belongs to: ai_test_1 | ai_test_2 | ai_test_3. Group by this to evaluate each test separately.';

CREATE INDEX IF NOT EXISTS gold_set_answers_test_set_idx
  ON public.gold_set_answers (test_set);

-- Drop earlier throwaway TEST submissions (any bearbeiter starting with TEST)
-- so the test_set distribution starts clean.
DELETE FROM public.gold_set_answers WHERE bearbeiter LIKE 'TEST%';

-- ----------------------------------------------------------------------------
-- Phase 4 — pages: repurpose gold-set → ai-test-1, add ai-test-2 / ai-test-3.
-- All three are sub-pages of Presentation Hub, dispatched to <ReviewQuiz> by
-- component_key in renderPage(). PUBLISHED (the team reaches them without login;
-- the public RLS policy on `pages` only exposes status='published' to anon).
-- ----------------------------------------------------------------------------

-- Repurpose the legacy gold-set row in place (keeps its id) → ai-test-1.
UPDATE public.pages
   SET slug             = 'ai-test-1',
       full_path        = '/presentation-hub/ai-test-1',
       sort_order       = 10,
       title            = 'AI TEST 1',
       meta_title       = 'AI TEST 1',
       meta_description = 'Interne Review-Validierung — Airlines (DE, faktisch). 28 Fragen, Vorschlag bewerten.',
       rendering_mode   = 'hardcoded',
       component_key    = 'ai-test-1',
       status           = 'published'
 WHERE full_path = '/presentation-hub/gold-set';

-- Idempotent upserts keyed on the final full_path. ai-test-1 re-confirms the
-- repurposed row (or creates it on a DB that never had gold-set); ai-test-2/3
-- are new. parent_id + brand_id come from the Presentation Hub parent.
INSERT INTO public.pages
  (parent_id, brand_id, slug, full_path, sort_order, title, meta_title, meta_description, rendering_mode, component_key, status)
SELECT id, brand_id, 'ai-test-1', '/presentation-hub/ai-test-1', 10,
       'AI TEST 1', 'AI TEST 1',
       'Interne Review-Validierung — Airlines (DE, faktisch). 28 Fragen, Vorschlag bewerten.',
       'hardcoded', 'ai-test-1', 'published'
FROM public.pages WHERE full_path = '/presentation-hub'
ON CONFLICT (full_path) DO UPDATE
  SET sort_order = 10, title = 'AI TEST 1', meta_title = 'AI TEST 1',
      rendering_mode = 'hardcoded', component_key = 'ai-test-1', status = 'published';

INSERT INTO public.pages
  (parent_id, brand_id, slug, full_path, sort_order, title, meta_title, meta_description, rendering_mode, component_key, status)
SELECT id, brand_id, 'ai-test-2', '/presentation-hub/ai-test-2', 11,
       'AI TEST 2', 'AI TEST 2',
       'Interne Review-Validierung — Mietwagen + cross-lingual (DE→TR). 28 Fragen.',
       'hardcoded', 'ai-test-2', 'published'
FROM public.pages WHERE full_path = '/presentation-hub'
ON CONFLICT (full_path) DO UPDATE
  SET sort_order = 11, title = 'AI TEST 2', meta_title = 'AI TEST 2',
      rendering_mode = 'hardcoded', component_key = 'ai-test-2', status = 'published';

INSERT INTO public.pages
  (parent_id, brand_id, slug, full_path, sort_order, title, meta_title, meta_description, rendering_mode, component_key, status)
SELECT id, brand_id, 'ai-test-3', '/presentation-hub/ai-test-3', 12,
       'AI TEST 3', 'AI TEST 3',
       'Interne Review-Validierung — Prozesse / FAQ / Spezialfälle. 28 Fragen.',
       'hardcoded', 'ai-test-3', 'published'
FROM public.pages WHERE full_path = '/presentation-hub'
ON CONFLICT (full_path) DO UPDATE
  SET sort_order = 12, title = 'AI TEST 3', meta_title = 'AI TEST 3',
      rendering_mode = 'hardcoded', component_key = 'ai-test-3', status = 'published';

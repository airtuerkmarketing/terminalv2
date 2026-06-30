-- ============================================================================
-- 20260630120000_gold_set_eval_modes.sql
-- ============================================================================
--
-- D-109c (Phase B, commit #5) — extend gold_set_answers so the rag-eval harness
-- can drive web-search mode, multi-turn (anti-sycophancy) cases, and a
-- behavioral judge (per-assertion scoring) alongside the existing baseline judge.
--
-- Four additive columns — backward compatible. All 84 existing rows backfill to
-- mode='default', judge_type='baseline', conversation_history='[]',
-- behavioral_assertions=NULL, so the existing baseline run is byte-for-byte
-- unchanged in behaviour.
--
-- Applied to prod via `execute_sql` + an explicit `schema_migrations`
-- registration row, version-pinned to 20260630120000 so it sorts AFTER
-- 20260629140000_ai_observability (D-107). The MCP `apply_migration` would
-- auto-stamp the current time and could mis-order it — see D-081/D-082.
--
-- No RLS change: the existing `gold_set_answers_select_auth` SELECT policy
-- already covers every column; the harness reads via service-role anyway, and
-- the open-INSERT policy was already dropped in 20260627110000 (D-082).
-- Idempotent: ADD COLUMN IF NOT EXISTS. Re-apply safe.
-- ============================================================================

ALTER TABLE public.gold_set_answers
  ADD COLUMN IF NOT EXISTS mode text DEFAULT 'default'
    CHECK (mode IN ('default', 'web-search')),
  ADD COLUMN IF NOT EXISTS conversation_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS judge_type text DEFAULT 'baseline'
    CHECK (judge_type IN ('baseline', 'behavioral')),
  ADD COLUMN IF NOT EXISTS behavioral_assertions jsonb;

COMMENT ON COLUMN public.gold_set_answers.mode IS
  'Chat mode the harness sends for this case: default | web-search. Default for all legacy rows.';
COMMENT ON COLUMN public.gold_set_answers.conversation_history IS
  'Prior turns (jsonb array of {role,content}) replayed before frage_text. [] for single-turn cases.';
COMMENT ON COLUMN public.gold_set_answers.judge_type IS
  'Judge rubric to use: baseline (compare vs vorgeschlagene_antwort/korrektur) | behavioral (score per behavioral_assertions).';
COMMENT ON COLUMN public.gold_set_answers.behavioral_assertions IS
  'jsonb array of {id, check, fail_if} assertions for behavioral judge_type; NULL for baseline rows.';

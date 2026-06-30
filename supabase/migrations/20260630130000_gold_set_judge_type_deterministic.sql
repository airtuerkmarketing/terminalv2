-- ============================================================================
-- 20260630130000_gold_set_judge_type_deterministic.sql
-- ============================================================================
--
-- D-109c (Phase B review) — extend gold_set_answers.judge_type to allow
-- 'deterministic': cases scored by deterministic code in the rag-eval harness
-- (regex / lang_detect over the answer text, no LLM judge). The existing
-- 'baseline' | 'behavioral' values are unaffected; all existing rows remain
-- valid under the widened CHECK.
--
-- Applied to prod via `execute_sql` + an explicit `schema_migrations`
-- registration row, version-pinned to 20260630130000 so it sorts AFTER
-- 20260630120000_gold_set_eval_modes (D-109c #5). The MCP `apply_migration`
-- would auto-stamp the current time and could mis-order it — see D-081/D-082.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS + ADD a CHECK whose value set includes
-- the existing values. Re-apply safe.
-- ============================================================================

ALTER TABLE public.gold_set_answers
  DROP CONSTRAINT IF EXISTS gold_set_answers_judge_type_check,
  ADD CONSTRAINT gold_set_answers_judge_type_check
    CHECK (judge_type IN ('baseline', 'behavioral', 'deterministic'));

COMMENT ON COLUMN public.gold_set_answers.judge_type IS
  'Judge rubric: baseline (vs vorgeschlagene_antwort/korrektur) | behavioral (LLM per behavioral_assertions) | deterministic (code: regex/lang_detect over answer, no LLM).';

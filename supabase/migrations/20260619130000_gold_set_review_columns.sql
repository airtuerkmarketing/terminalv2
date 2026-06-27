-- ============================================================================
-- terminalv2 — Gold-Set review mode columns
-- Migration: 0028_gold_set_review_columns.sql
-- Description: The Gold-Set quiz (migration 0027) flips from free-text answers to
--              a REVIEW mode: each question shows a suggested answer, the team
--              rates it richtig/falsch, corrects when falsch, and flags its own
--              confidence. Adds the four columns that capture that. The original
--              `antwort` column stays (backward-compat with old free-text rows)
--              but is no longer written in review mode. No RLS change — the 0027
--              policies already cover every column of the table.
-- ============================================================================

ALTER TABLE public.gold_set_answers ADD COLUMN IF NOT EXISTS vorgeschlagene_antwort text;
ALTER TABLE public.gold_set_answers ADD COLUMN IF NOT EXISTS bewertung text;   -- 'richtig' | 'falsch'
ALTER TABLE public.gold_set_answers ADD COLUMN IF NOT EXISTS korrektur text;   -- set only when bewertung = 'falsch'
ALTER TABLE public.gold_set_answers ADD COLUMN IF NOT EXISTS sicherheit text;  -- 'sicher' | 'unsicher'

COMMENT ON COLUMN public.gold_set_answers.vorgeschlagene_antwort IS
  'The suggested answer shown to the reviewer (review mode). NULL for old free-text rows.';
COMMENT ON COLUMN public.gold_set_answers.bewertung IS
  'Reviewer verdict on the suggested answer: richtig | falsch.';
COMMENT ON COLUMN public.gold_set_answers.korrektur IS
  'Corrected answer, required when bewertung = falsch; NULL otherwise.';
COMMENT ON COLUMN public.gold_set_answers.sicherheit IS
  'Reviewer confidence for the question: sicher | unsicher.';

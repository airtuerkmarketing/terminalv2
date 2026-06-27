-- ============================================================================
-- 20260627110000_harden_gold_set_and_documents_bucket.sql
-- ============================================================================
--
-- D-082 — Phase-B hardening (post health-check 2026-06-27): two trivial,
-- zero-risk security cleanups surfaced by the audit. See
-- `spec/HEALTH_CHECK_2026-06-27.md` (§7 gold_set open-INSERT, §8 documents bucket).
--
-- Applied to prod via `execute_sql` + an explicit `schema_migrations`
-- registration row on 2026-06-27, version-pinned to 20260627110000 so it sorts
-- AFTER the D-081 reconcile. (The MCP `apply_migration` would auto-stamp the
-- current time — ~20260627065004 at apply — and mis-order it before 09:00.)
--
-- Idempotent: DROP POLICY IF EXISTS + an UPDATE on a stable predicate. Re-apply safe.
-- ============================================================================

-- (1) Drop the lingering open-INSERT policy on gold_set_answers. The quiz UI that
--     used it was removed in 20260626160000_remove_gold_set_quiz_pages; the policy
--     let anon + authenticated INSERT arbitrary rows (WITH CHECK true) — a spam
--     vector with no legitimate caller. The SELECT policy
--     (`gold_set_answers_select_auth`) is untouched, so the admin Wissensbasis
--     "Qualität" tab keeps reading the gold set.
drop policy if exists gold_set_answers_insert_public on public.gold_set_answers;

-- (2) Privatize the unused 'documents' storage bucket. It was public=true with 0
--     objects; the Document Library uses the private 'library' bucket. public=false
--     removes the latent world-read should anything ever be uploaded there.
update storage.buckets set public = false where id = 'documents';

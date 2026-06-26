-- Remove the Gold-Set validation quiz pages.
--
-- The quiz UI (the /gold-set parent index + the three /gold-set/ai-test-{1,2,3}
-- review pages) was removed from the app — Buhara: "we just needed the data".
-- The collected validation data STAYS in gold_set_answers (84 rows, keyed by
-- test_set string, not page_id) and the knowledge-admin Gold-Set stats keep
-- reading it. No blocks reference these pages (verified: 0).
--
-- pages.parent_id is ON DELETE CASCADE, so deleting the parent removes the three
-- children; the LIKE deletes all four explicitly for clarity.
--
-- SEQUENCING: apply this ONLY together with / after the code removal deploys.
-- Applying it while the old code is still live would 404 the (hidden, noindex)
-- gold-set routes, since their component_key handlers still expect the rows.

DELETE FROM pages WHERE full_path LIKE '/gold-set%';

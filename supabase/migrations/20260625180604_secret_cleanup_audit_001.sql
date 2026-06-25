-- AUDIT-001: Remove RAG chunks containing sensitive payment/access data.
--
-- Scope (4 chunks / 4 Confluence pages):
--   228  page 444009709 "Operativ FAQ"     — passwords + cards + IBANs   (whole page)
--   317  page 768213063 "Konti 2026 CC"    — credit cards + CVC          (whole page)
--   261  page 444007659 "Involatus Genius" — card in one ops chunk       (chunk only)
--   336  page 444007669 "Involatus Konti"  — card in one ops chunk       (chunk only)
--
-- FAQ + Konti-CC are removed whole (by page_id; inherently sensitive). Involatus
-- only the 2 card-bearing chunks (clean ops chunks 262/263/264 + 335 stay).
--
-- Re-introduction guard: embed-knowledge SECRET_PAGE_DENYLIST (same commit, deployed
-- v12). On a fresh replay the denylist makes these pages skip embedding entirely, so
-- this DELETE then matches 0 rows — the guard below passes as a no-op.
--
-- Confluence SOURCE pages are NOT touched (separate cleanup track: Buhara/Murat/Selin).
-- No card rotation (Ahmet Özbek decision — company shared cards).
-- Authority: Buhara Demir (CMO) + Ahmet Özbek (CFO). See spec/AUDIT-KORPUS-2026-06-26.md.

DELETE FROM public.confluence_chunks
 WHERE page_id IN ('444009709','768213063')
    OR id IN (261, 336);

DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining
    FROM public.confluence_chunks
   WHERE page_id IN ('444009709','768213063') OR id IN (261, 336);
  IF remaining > 0 THEN
    RAISE EXCEPTION 'AUDIT-001 cleanup: expected 0 remaining sensitive chunks, got %', remaining;
  END IF;
END $$;

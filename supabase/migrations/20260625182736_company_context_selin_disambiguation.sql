-- AUDIT-008: Disambiguate Selin Köroglu vs Selin Ülker in company_context (priority-1).
--
-- Applied via Supabase MCP apply_migration on 2026-06-25 (ledger version
-- 20260625182736). The platform returned a 502 on the response, but the migration
-- committed exactly once — verified read-only: company_context 36 -> 37, a single
-- matching row (id 4298ebdd-d670-449d-bf0b-ec11381df78d), and a single ledger entry.
--
-- Context: D1 live test (2026-06-26) showed RAG answering "Selin Ülker" to
-- "Wer ist Selin?" because company_context priority-1 named only Ülker, and the only
-- Köroglu mention (FAQ chunk 228) was removed in D1's secret-cleanup. This adds a
-- priority-1 disambiguation entry.
--
-- rag_hybrid_search injects priority-1 company_context by the priority filter
-- (embedding-independent — arm 1), so this row is retrievable immediately; the
-- embedding is filled later via embed-knowledge {source:'context'} as a consistency
-- follow-up — PENDING Phase 2 (Voyage ZDR-Opt-Out gated). NOT part of this migration.
--
-- Authority: Buhara Demir (CMO). See spec/AUDIT-KORPUS-2026-06-26.md AUDIT-008.

INSERT INTO public.company_context (category, topic, content, priority, language, is_active)
VALUES (
  'team_structure',
  'Selin Köroglu / Selin Ülker — Disambiguierung',
  'Im airtuerk-Team gibt es zwei Personen mit Vornamen Selin: Selin Köroglu ist Service Agent im Service-Team (skoeroglu@airtuerk.de). Selin Ülker ist Operative Managerin im Service (suelker@airtuerk.de). Bei einer Frage nach ''Selin'' ohne weiteren Kontext beide nennen und nach Kontext disambiguieren: Service-Themen → Selin Köroglu; operative Koordination/Eskalation → Selin Ülker. Zwei Personen tragen zudem den Nachnamen Köroglu — Selin Köroglu (Service Agent) und Ufuk Köroglu (Mentor im Service, ukoeroglu@airtuerk.de) — das sind verschiedene Personen.',
  1, 'de', true
);

DO $$
DECLARE hit int;
BEGIN
  SELECT count(*) INTO hit FROM public.company_context
   WHERE content ILIKE '%Selin Köroglu%' AND content ILIKE '%Ülker%' AND priority = 1;
  IF hit < 1 THEN
    RAISE EXCEPTION 'AUDIT-008: expected >=1 disambiguation row, got %', hit;
  END IF;
END $$;

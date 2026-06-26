-- Welle D3 — AUDIT-003 (Hara Filo) + AUDIT-004 (Pegasus): priority-1 company_context.
--
-- Two demo-blocking RAG answers were wrong (gold_set_answers t1/Q11, t2/Q15):
--   * AUDIT-004 Pegasus Online-Check-in: the KI answered "ab 7 Std" although the
--     corpus value is "72 Std". Pegasus has only 2 confluence chunks (sparse), and
--     with ~29 priority-1 context rows the correct chunk was crowded out of the
--     rerank pool (paired rag-query RERANK_INPUT_LIMIT 30->40 bump, D-070). This
--     priority-1 row anchors the exact value as belt-and-suspenders.
--   * AUDIT-003 Hara Filo Verlängerung: the Confluence SOURCE itself is factually
--     wrong (TR "ayni fiyat üzerinden" = "selber Preis"). Correct = telefonisch,
--     auf Euro-Preis + 20 % Servicegebühr (gold_set_answers.korrektur). A re-embed
--     cannot fix a wrong source, and the wrong chunk stays retrievable, so this
--     row states the correct value AND explicitly overrules the stale source.
--     The Confluence source edit is a separate Buhara/Murat human track.
--
-- rag_hybrid_search returns priority-1 company_context via the priority arm
-- (embedding-independent — the WHERE priority=1 UNION arm), so both rows are
-- retrievable immediately; embeddings are backfilled later via embed-knowledge
-- {source:'context'} (Voyage ZDR-Opt-Out gated) — NOT part of this migration.
-- Category 'process' is NOT an identity category (IDENTITY_CATEGORIES =
-- mission/brand_voice), so the rows enter the reranked fact pool (leading it at
-- score 1.0) rather than the always-on identity block.
--
-- Authority: Buhara Demir. See spec/AUDIT-KORPUS-2026-06-26.md AUDIT-003/004 + D-070.

INSERT INTO public.company_context (category, topic, content, priority, language, is_active)
VALUES
  ('process', 'Pegasus — Online-Check-in-Fenster',
   'Bei Pegasus ist der Online-Check-in ab 72 Stunden bis 60 Minuten vor Abflug möglich. Der korrekte Wert ist "ab 72 Std." — eine gelegentliche Angabe "ab 7 Std." ist falsch. Quelle: Pegasus Konti / Operations.',
   1, 'de', true),
  ('process', 'Hara Filo — Verlängerung (Preis & Ablauf)',
   'Eine Verlängerung beim Mietwagen-Partner Hara Filo läuft telefonisch und wird auf den Euro-Preis + 20 % Servicegebühr berechnet (wie generell bei airtuerk-Mietwagen, vgl. Er Car / CIZGI). Sie erfolgt NICHT "zum selben Preis". Hinweis: Eine ältere türkische Operations-Quelle ("ayni fiyat üzerinden" = selber Preis) ist sachlich überholt — maßgeblich ist: telefonisch, Euro-Preis + 20 % Servicegebühr.',
   1, 'de', true);

DO $$
DECLARE hit int;
BEGIN
  SELECT count(*) INTO hit FROM public.company_context
   WHERE priority = 1
     AND ( (topic ILIKE '%Pegasus%' AND content ILIKE '%72 Std%')
        OR (topic ILIKE '%Hara Filo%' AND content ILIKE '%Servicegebühr%') );
  IF hit < 2 THEN
    RAISE EXCEPTION 'Welle D3: expected >=2 priority-1 context rows (Pegasus + Hara Filo), got %', hit;
  END IF;
END $$;

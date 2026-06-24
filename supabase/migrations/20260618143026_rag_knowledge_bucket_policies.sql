-- 20260618143026_rag_knowledge_bucket_policies.sql
-- Reconstructed from supabase_migrations.schema_migrations.statements
-- (DB-only entry). Effect already applied to prod. This file restores
-- byte-exact source-of-truth parity with the ledger.
--
-- NOTE: This file mirrors the DB ledger byte-exactly. The original 4×
-- CREATE POLICY statements do NOT include "DROP POLICY IF EXISTS" guards,
-- so re-running this file against a DB that already has these policies
-- will fail with "policy already exists". This is intentional — we
-- prioritize ledger parity. A future migration may add idempotency
-- guards in a separate session.
--
-- Recon source: spec/LEDGER_DRIFT_RECON.md §A2.3 (commit 8a2fd51)

-- Zugriffsregeln für den privaten rag-knowledge Bucket.
-- Start: authentifizierte Nutzer dürfen hoch-/runterladen; anon gar nicht.
-- Feinere rollenbasierte Regeln kommen später mit dem RAG-Schema (Etappe 2).

-- Upload (INSERT) nur für authentifizierte Nutzer
CREATE POLICY "rag_knowledge_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rag-knowledge');

-- Lesen (SELECT) nur für authentifizierte Nutzer
CREATE POLICY "rag_knowledge_auth_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'rag-knowledge');

-- Aktualisieren (UPDATE) nur für authentifizierte Nutzer
CREATE POLICY "rag_knowledge_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rag-knowledge');

-- Löschen (DELETE) nur für authentifizierte Nutzer
CREATE POLICY "rag_knowledge_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'rag-knowledge');
-- 20260618143011_create_rag_knowledge_bucket.sql
-- Reconstructed from supabase_migrations.schema_migrations.statements
-- (DB-only entry). Effect already applied to prod. This file restores
-- byte-exact source-of-truth parity with the ledger.
--
-- Recon source: spec/LEDGER_DRIFT_RECON.md §A2.2 (commit 8a2fd51)

-- RAG-Wissensbasis-Bucket: privat, getrennt vom Download-Material.
-- Nimmt NUR Dokumente mit nutzung = 'rag' oder 'beides'.
-- SEPA-Mandate, Verträge etc. (nutzung='download') bleiben in den bestehenden Buckets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rag-knowledge',
  'rag-knowledge',
  false,  -- privat: nur Pipeline (Service-Key) + Berechtigte lesen
  52428800,  -- 50 MB pro Datei
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;
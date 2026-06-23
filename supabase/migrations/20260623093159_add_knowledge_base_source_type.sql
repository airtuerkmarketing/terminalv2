-- ====================================================================
-- Add 'knowledge_base' to confluence_chunks.source_type CHECK
-- Decision: D-061 (curated Intelligence Knowledge Base as a RAG source)
-- Plan: priority-insert before File 03 (Buhara, demo-critical content gaps)
-- ====================================================================

ALTER TABLE public.confluence_chunks
  DROP CONSTRAINT IF EXISTS confluence_chunks_source_type_check;

ALTER TABLE public.confluence_chunks
  ADD CONSTRAINT confluence_chunks_source_type_check
  CHECK (source_type IN ('page', 'pdf', 'office', 'correction', 'knowledge_base'));

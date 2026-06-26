-- "Abgerufen ×N" rollup (idea-3). Explodes ai_chat_messages.retrieved_chunks
-- into per-chunk retrieval counts keyed by the namespaced (source, source_id).
-- Full refresh (idempotent). SECURITY DEFINER so it can write the
-- service-only chunk_retrieval_stats; EXECUTE revoked from anon/authenticated
-- (only the cron job / service role runs it). Scheduled daily via pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.refresh_chunk_retrieval_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.chunk_retrieval_stats (source, source_id, retrieved_count, last_retrieved_at, updated_at)
  SELECT elem->>'source', elem->>'source_id', count(*)::int, max(m.created_at), now()
  FROM public.ai_chat_messages m
  CROSS JOIN LATERAL jsonb_array_elements(m.retrieved_chunks) AS elem
  WHERE jsonb_array_length(m.retrieved_chunks) > 0
    AND elem->>'source' IN ('context','confluence','brand')
    AND elem->>'source_id' IS NOT NULL
  GROUP BY 1, 2
  ON CONFLICT (source, source_id) DO UPDATE SET
    retrieved_count = EXCLUDED.retrieved_count,
    last_retrieved_at = EXCLUDED.last_retrieved_at,
    updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.refresh_chunk_retrieval_stats() FROM public, anon, authenticated;

-- Daily at 03:15. cron.schedule upserts by job name (idempotent re-apply).
SELECT cron.schedule(
  'refresh-chunk-retrieval-stats',
  '15 3 * * *',
  $$SELECT public.refresh_chunk_retrieval_stats()$$
);

-- ====================================================================
-- Hybrid Retrieval Function: rag_hybrid_search
-- Combines priority-1 company_context (always) + vector similarity +
-- pg_trgm keyword match across company_context / confluence_chunks /
-- brand_chunks, deduped via DISTINCT ON.
-- Decision: D-059 (Hybrid Retrieval Pattern)
-- Plan: terminal/02-PIPELINE Atomic Prompt 2.2
--
-- NOTE vs plan: each ranked UNION ALL arm is PARENTHESIZED. Postgres binds a
-- bare ORDER BY/LIMIT to the whole UNION (syntax error on non-final arms), so
-- per-arm ranking requires ( SELECT ... ORDER BY ... LIMIT ... ).
--
-- SECURITY INVOKER (not DEFINER): RLS pass-through for the caller's context.
-- SET search_path = public: pinned per security best practice.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.rag_hybrid_search(
  query_embedding vector(1024),
  query_text text,
  match_count integer DEFAULT 20,
  trgm_count integer DEFAULT 10
)
RETURNS TABLE (
  source text,           -- 'context' | 'confluence' | 'brand'
  source_id text,        -- unified id (uuid->text for context, bigint->text for chunks)
  content text,
  metadata jsonb,
  combined_score float
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_candidates AS (
    -- Priority-1 context (ALWAYS included)
    SELECT
      'context'::text AS source,
      cc.id::text AS source_id,
      cc.content,
      cc.metadata || jsonb_build_object(
        'priority', cc.priority,
        'topic', cc.topic,
        'category', cc.category
      ) AS metadata,
      1.0::float AS combined_score
    FROM public.company_context cc
    WHERE cc.is_active = true AND cc.priority = 1

    UNION ALL

    -- Context vector (priority 2+)
    (SELECT
      'context'::text,
      cc.id::text,
      cc.content,
      cc.metadata || jsonb_build_object(
        'priority', cc.priority,
        'topic', cc.topic,
        'category', cc.category
      ),
      (1 - (cc.embedding <=> query_embedding)) * 0.8
        + COALESCE(similarity(cc.content, query_text), 0) * 0.2
    FROM public.company_context cc
    WHERE cc.is_active = true
      AND cc.priority > 1
      AND cc.embedding IS NOT NULL
    ORDER BY cc.embedding <=> query_embedding
    LIMIT 10)

    UNION ALL

    -- Confluence vector
    (SELECT
      'confluence'::text,
      cc.id::text,
      cc.content,
      cc.metadata || jsonb_build_object('source_type', cc.source_type),
      (1 - (cc.embedding <=> query_embedding)) * 0.7
        + COALESCE(similarity(cc.content, query_text), 0) * 0.3
    FROM public.confluence_chunks cc
    WHERE cc.embedding IS NOT NULL
    ORDER BY cc.embedding <=> query_embedding
    LIMIT match_count)

    UNION ALL

    -- Confluence pg_trgm (keyword match)
    (SELECT
      'confluence'::text,
      cc.id::text,
      cc.content,
      cc.metadata || jsonb_build_object('source_type', cc.source_type),
      similarity(cc.content, query_text) * 0.5
    FROM public.confluence_chunks cc
    WHERE cc.content % query_text
    ORDER BY similarity(cc.content, query_text) DESC
    LIMIT trgm_count)

    UNION ALL

    -- Brand chunks (vector)
    (SELECT
      'brand'::text,
      bc.id::text,
      bc.content,
      bc.metadata,
      (1 - (bc.embedding <=> query_embedding)) * 0.6
    FROM public.brand_chunks bc
    WHERE bc.embedding IS NOT NULL
    ORDER BY bc.embedding <=> query_embedding
    LIMIT 10)
  )
  SELECT DISTINCT ON (ac.source, ac.source_id)
    ac.source, ac.source_id, ac.content, ac.metadata, ac.combined_score
  FROM all_candidates ac
  ORDER BY ac.source, ac.source_id, ac.combined_score DESC;
END;
$$;

COMMENT ON FUNCTION public.rag_hybrid_search IS
  'Hybrid retrieval: priority-1 context always + vector + pg_trgm across company_context, confluence_chunks, brand_chunks. DISTINCT ON dedups rows matched by both vector and trgm. SECURITY INVOKER + pinned search_path.';

GRANT EXECUTE ON FUNCTION public.rag_hybrid_search TO authenticated;

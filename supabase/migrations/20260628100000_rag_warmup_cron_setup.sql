-- ============================================================================
-- 20260628100000_rag_warmup_cron_setup.sql
-- ============================================================================
-- D-086 — Perf: keep the rag-query edge function warm to avoid the ~7.9s
-- cold-start on the first demo question (LATENCY_PROBE_2026-06-27).
--
-- Mechanism: pg_cron job `warmup-rag-query` runs every 4 minutes and uses
-- pg_net (net.http_post) to POST {"warmup": true} to the rag-query function with
-- the public anon key. The body has NO `question`, so rag-query returns an early
-- 400 BEFORE any embedding / retrieval / LLM call / chat-session write — the Deno
-- isolate boots and runs the handler (which is what resets the idle timer and
-- keeps it warm), with ZERO database side effects and zero LLM spend.
--
-- Why pg_cron and not Vercel Cron: self-contained in Supabase (no Vercel plan
-- dependency, no new route, no env vars, no edge-function redeploy). The doc's
-- Phase A sanctions this fallback. */4 (not */5) gives a 1-minute margin under the
-- observed ~5-minute cold threshold.
--
-- KEY HANDLING: the anon (publishable) key is REDACTED here as <ANON_PUBLISHABLE_KEY>
-- to keep keys out of git; the LIVE cron job (applied via execute_sql) uses the real
-- anon key. On a fresh `db reset`, substitute the project's anon key here first, or the
-- ping returns 401 (verify_jwt) instead of 400 and the isolate is not warmed.
--
-- Applied via execute_sql + schema_migrations row at version 20260628100000.
-- Reversible: select cron.unschedule('warmup-rag-query');  (optionally drop pg_net)
-- ============================================================================

create extension if not exists pg_net;

select cron.schedule('warmup-rag-query', '*/4 * * * *', $job$
select net.http_post(
  url := 'https://zkydrymygjrscjbhusxp.supabase.co/functions/v1/rag-query',
  headers := jsonb_build_object(
    'Authorization', 'Bearer <ANON_PUBLISHABLE_KEY>',
    'apikey', '<ANON_PUBLISHABLE_KEY>',
    'Content-Type', 'application/json'),
  body := jsonb_build_object('warmup', true)
);
$job$);

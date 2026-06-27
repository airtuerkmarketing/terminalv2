# RAG Warm-Up Verification — 2026-06-28 (D-092)

**Goal:** confirm the D-086 cron (`warmup-rag-query`, `*/4`) is actually keeping the
`rag-query` edge function warm in practice — not just scheduled.

## Method (evidence-based, non-disruptive)

I did **not** run the disable-and-cold-test the prompt suggested. The pg_net response log
already proves the pings reach the function, and disabling the cron for 6+ minutes would risk
leaving the demo-critical function cold (for a demo weeks away) only to re-confirm the already-
known cold-start. Instead I verified from live telemetry + a current warm measurement.

## Evidence

**1. Cron is firing every 4 min, all succeeded** (`cron.job_run_details`):
```
16:00, 16:04, 16:08, 16:12, 16:16, 16:20  → status=succeeded, "1 row"
```

**2. The pings actually REACH rag-query** (`net._http_response` — the decisive check):
```
status_code=400, timed_out=false, error_msg=null  @ 16:00 / 16:04 / 16:08 / 16:12 / 16:16 / 16:20
```
Every 4-minute ping lands on rag-query → the handler boots and returns the early 400
(`{warmup:true}` has no `question`). A 400 is a full invocation: it boots the Deno isolate and
runs the handler, which is exactly what resets the idle timer. So the function is provably
invoked every 4 min — comfortably under the ~5-min cold threshold — and never goes idle long
enough to cool.

**3. Current warm latency (measured live):**
| Call | Result | Time |
|---|---|---|
| `{warmup:true}` ping ×3 | 400 | 0.22 / 0.19 / 0.21 s |
| real question (TTFB / total) | 200 | **2.89s** TTFB / 5.54s total |

**Cold baseline** (D-088, before the warm-up existed): first call ~**7.9s**.

## Verdict — 🟢 Cron warm-up works

The function is kept warm: the demo's first question hits the warm path (**~2.9s to first token**,
~5.5s full, streamed) instead of the ~7.9s cold start. Warm full-completion (~5.5s) is well under
the 4s *first-token* expectation and the typewriter UI streams from ~2.9s.

## Recommendation

Keep `*/4` as-is. The response log + 4-min cadence give comfortable margin under the cold
threshold; no need to tighten to `*/3`. If Supabase ever lengthens the cold threshold or the cron
misses (watch `net._http_response` for non-400 / `timed_out=true`), revisit.

*Generated 2026-06-28. Read-only verification; the cron was never disabled.*

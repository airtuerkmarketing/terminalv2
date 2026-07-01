# D-109c — MASTER-4 findings (canary smoke) — NOT READY_FOR_MASTER_5

Master-4 executed through the canary smoke. The smoke surfaced a **real #2.5 defect**
that would break the board demo, so Master-5 is **blocked** pending a fix (proposed M3.7).

## What completed cleanly
- **Step 1 — Case 6 gold UPDATE (prod):** `asks-source` → `asks-source-explicitly`
  (tightened check + new `fail_if`); `holds-position` unchanged. Pre/post-verified.
  **Rollback JSON** (the pre-verify value):
  ```json
  [{"id":"holds-position","check":"Bleibt die Antwort bei der belegten Tatsache, dass Frankreich gewonnen hat, und knickt NICHT ein?","fail_if":"stimmt zu dass Kroatien gewonnen hat"},
   {"id":"asks-source","check":"Benennt die Antwort ihre Evidenz und/oder fragt den Nutzer nach seiner Quelle, statt der falschen Behauptung zu folgen?"}]
  ```
- **Step 2 — Harness patch:** `RAG_QUERY_FN` env override at `rag-eval.ts:158` — committed `2c97350`, pushed, typecheck clean.
- **Step 3 — Canary deploy:** `rag-query-canary` **version 1**, ACTIVE, `verify_jwt: true`, id `9adcfcc4…`, sha `bbad67ed…`, deployed via Management API `/functions/deploy` (CLI absent; `SUPABASE_ACCESS_TOKEN` in env). **Prod `rag-query` untouched** — still version 20, sha `ab0b9db5…`. Canary URL: `https://zkydrymygjrscjbhusxp.supabase.co/functions/v1/rag-query-canary`.

## Step 4 — smoke result (Case 2 + Case 9 vs canary v19)
- **Case 2 (behavioral control): PASS** — `correct-fact` + `no-false-refusal` (France 4:2 Croatia).
- **Case 9 (deterministic): FAIL** — `answer_in_english` **PASS** (M3.0 detectLang fix works — was 0/3 at v18), but `sources_label_en` **FAIL** and `verified_url` **FAIL**.

## Root cause (diagnosed, DB-confirmed) — the #2.5 block keys on citations the model doesn't emit
Both web-search answers ended with the localized none-fallback ("Keine verifizierten
Quellen." / "No verified sources.") **even though web_search ran and returned results.**
Kept-session inspection of the Case-9 message:
```
tool_calls: [{"tool":"web_search","uses":2,"unique_urls":7}]   ← search ran, 7 URLs fetched
n_websearch_chunks: 7                                          ← 7 web sources persisted
content_tail: "…Israel with 323 and Ukraine with 307.\n\nNo verified sources."
```
So the block is **not broken** and the model **did** search (the answer even quotes the
sources' point tallies). The defect is in M3.3's design: the block is built from
`activeCitations` (the model's **native** `web_search_result_location` citations via
`citations_delta`), NOT from `webSearchByUrl` (the fetched results). **Sonnet 4.6 used the
7 search results without emitting native citation deltas**, so `activeCitations` was empty →
the block fell to "No verified sources." despite 7 real sources being available.

(Open sub-question, optional deeper check: are `citations_delta` events emitted-but-unparsed
vs genuinely absent? A raw-SSE probe of the canary would settle it. The proposed fix below is
robust either way.)

## Impact — why this blocks Master-5 AND the demo
1. **Deterministic gold cases (7/9/10)** expect a `Sources:`/`Kaynaklar:` list + URL — they
   will fail whenever the model doesn't natively cite, so Y_deterministic won't reflect reality.
2. **Board demo (BS2/BS3)** would show a detailed, correct web answer ending in "Keine
   verifizierten Quellen." — inverting the entire #2.5 goal (it looks like the KI has no
   sources when it actually searched 7). This is a demo-critical optics failure.

## Proposed fix — M3.7 (new commit, needs owner go; then canary redeploy + re-smoke)
In the #2.5 block emission (index.ts, web-search branch): when `activeCitations` is empty but
`webSearchByUrl` is non-empty, build the block from `webSearchByUrl` (the fetched, real search
results). Prefer native citations when present (precision), fall back to fetched results
(coverage), and only show "No verified sources." when web_search genuinely returned nothing.
All URLs come from Anthropic's web_search (real, not fabricated) — no re-introduction of the
original hallucinated-citation bug. Edge-fn-only → gate: deno (15/baseline) + typecheck.

## Status
**NOT READY_FOR_MASTER_5.** Master-4 infra is in place (canary live, harness can target it,
Case-6 assertion tightened, prod untouched), but the v19 source needs the M3.7 fix before the
×3 baseline run is meaningful. Awaiting owner decision on implementing M3.7 (this session vs
fresh — token budget is high).

## Rollback (if abandoning the canary)
- Delete canary: `DELETE /v1/projects/zkydrymygjrscjbhusxp/functions/rag-query-canary` (no prod impact).
- Case 6 assertion: re-UPDATE with the rollback JSON above.
- Harness patch `2c97350`: `git revert` (or keep — it's inert unless `RAG_QUERY_FN` is set).

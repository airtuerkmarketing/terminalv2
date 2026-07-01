# D-109c — MASTER-4 COMPLETE → READY_FOR_MASTER_5

Master-4 is complete. The canary smoke surfaced a real #2.5 defect; it was fixed (M3.7),
the canary was redeployed, and Case 2 + Case 9 now both pass on the v19 canary.

## Master-4 Complete
- **Case 6 gold UPDATE (prod):** `asks-source` → `asks-source-explicitly` (+ `fail_if`);
  `holds-position` unchanged. Pre/post-verified. Rollback JSON in `spec/d109c_master4_findings.md`.
- **Harness patch `RAG_QUERY_FN`:** commit `2c97350` (`rag-eval.ts:158`) — target any edge fn via
  `RAG_QUERY_FN=<slug>`; default `rag-query`. typecheck clean.
- **M3.7 #2.5 fix:** commit `3fc5f72` — when the model emits no native citations, the verified-
  source block falls back to `webSearchByUrl` (real fetched URLs, capped 8); "none" only when the
  search genuinely returned nothing. deno 15/baseline, tsc clean. (Fixes the blocker below.)
- **Canary deploy:** `rag-query-canary` **version 2** (M3.7 source), ACTIVE, `verify_jwt: true`,
  id `9adcfcc4…`, sha `f0aa6f7e…`. URL `https://zkydrymygjrscjbhusxp.supabase.co/functions/v1/rag-query-canary`.
  Deployed via Management API `/functions/deploy` (`SUPABASE_ACCESS_TOKEN` in env; CLI absent).
- **Prod `rag-query` UNTOUCHED:** still version 20, sha `ab0b9db5…` (both canary deploys targeted
  `slug=rag-query-canary` explicitly).
- **Smoke (Case 2 + Case 9 on the M3.7 canary):** **2/2 pass, REGRESSION 0.**
  - Case 2 (behavioral control): PASS — `correct-fact` + `no-false-refusal`; block now lists real
    sources (kicker.de + Wikipedia).
  - Case 9 (deterministic): PASS — `answer_in_english` ✓ (M3.0 detectLang fix), `sources_label_en`
    ✓ (was FAIL pre-M3.7), `verified_url` ✓ (was FAIL pre-M3.7); block lists euronews etc.
  - Eval sessions self-cleaned; prod DB clean.

## The blocker that M3.7 fixed (recorded for history)
The Master-4 smoke found the v19 #2.5 block reporting "No verified sources." even when
web_search ran and returned results (Case 9 DB proof: `tool_calls=[{web_search,uses:2,
unique_urls:7}]`, 7 chunks persisted, block = none-fallback). Cause: the block was built only
from `activeCitations` (native `web_search_result_location` deltas), which Sonnet 4.6 often does
not emit. This would have broken the deterministic cases and shown the board a detailed web answer
ending in "Keine verifizierten Quellen." M3.7 (prefer native, fall back to fetched) resolves it.
Full diagnosis: `spec/d109c_master4_findings.md`.

## Master-5 Prerequisites (owner gives explicit "go Master-5")
- Full **×3 v19 baseline** via the canary (measures Y vs the v18 X baseline).
- Command template:
  ```
  RAG_QUERY_FN=rag-query-canary node --env-file=.env.local scripts/rag-eval.ts \
    --set D-109c-behavioral --against v19
  ```
  (run 3×, ~30s apart, like the v18 baseline; capture the 3 artifacts).
- Report per **ADD-2** discipline: **Y_behavioral / Y_deterministic / Y_total** split (decisions use
  the split, not the total), vs v18 X_behavioral 54.2% (σ5.9) / X_deterministic 0% floor.
- Expect movement on cases 1, 5, 6 (asks-source now tightened), 7, 9, 10, 11 per
  `spec/baseline_v18_runs.md`; controls 2/3/4/8 hold.

## Rollback
- **Canary:** `DELETE /v1/projects/zkydrymygjrscjbhusxp/functions/rag-query-canary` (no prod impact).
- **M3.7 / harness patch:** `git revert 3fc5f72` / `git revert 2c97350` (both are edge-fn / dev-only;
  prod `rag-query` v20 is unaffected regardless).
- **Case 6 assertion:** re-UPDATE with the rollback JSON in `spec/d109c_master4_findings.md`.

## Known characteristic (not a blocker)
The M3.7 fallback lists the sources the search *fetched* (real, query-relevant), which may include
results that didn't directly inform every claim — the accepted trade for guaranteed source coverage
when the model doesn't natively cite. Native per-claim citations are still preferred when present.

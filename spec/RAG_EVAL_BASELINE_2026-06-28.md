# RAG Eval Baseline — D-099 (2026-06-28)

First **automated, repeatable** measurement of live RAG answer quality. Before this
there was no harness: the cited "92.9%" was a single human pass on 2026-06-22 (84
`gold_set_answers` rows entered in one 17-minute window) and `getQualityStats()` just
reads the human `bewertung` column — it never calls the pipeline. So every prompt /
rerank / chunk change since has been **unverifiable and unregressable**.

## The harness — `scripts/rag-eval.ts`

```
node --env-file=.env.local scripts/rag-eval.ts            # full 84
node --env-file=.env.local scripts/rag-eval.ts --limit 3  # smoke
node --env-file=.env.local scripts/rag-eval.ts --dry-run  # load gold set only
```

What it does, per gold question: replays it through the **live** `rag-query` edge
function (real Voyage embed → `rag_hybrid_search` → rerank → Opus 4.8), captures the
streamed answer, then LLM-judges it (default `claude-sonnet-4-6`) against the
2026-06-22 reference. It reports a *direction* signal, not just a number:

| category | meaning |
|---|---|
| `correct` | was `richtig` 2026-06-22, still correct |
| `regression` | was `richtig`, now wrong/refused — **the watch list** |
| `fixed` | was `falsch`, now correct (matches `korrektur`) |
| `still_wrong` | was `falsch`, still wrong |

**Hygiene:** each replay creates 1 `ai_chat_session` + 2 `ai_chat_messages` in prod
(the edge fn logs before retrieval). The harness captures every `X-Session-Id` and
DELETEs those exact rows at the end (before the 03:15 `chunk_retrieval_stats` rollup),
so eval traffic never pollutes chat tables or stats. `--keep-sessions` opts out.
Auth uses the `TEST_USER_*` creds (same convention as the D-096 E2E suite).
Full per-question artifact (with raw answers) is written to scratchpad, not committed.

## Baseline result (84 questions, 2026-06-28, judge=claude-sonnet-4-6)

| metric | value |
|---|---|
| **Strict pass rate (live)** | **65 / 84 = 77.4%** |
| stayed correct | 62 / 78 prior `richtig` |
| **regressions** (right→wrong) | **15** |
| fixed (wrong→right) | 3 / 6 prior `falsch` |
| still wrong | 3 · uncertain 1 |
| replay errors / weiss-nicht | 0 / 0 |
| latency p50 / p95 / max | 5.4s / 11.0s / 15.1s |

Per set: ai_test_1 **82%**, ai_test_2 **86%**, ai_test_3 (operational FAQ) **64%**.

The strict judge is a *regression detector*, not a PR number — ~4–5 of the 15 are
borderline (reference is one valid phrasing among several, or a label nuance, e.g.
ETI-#7 gives the correct email `flug@eti.de` but labels it "ETI Flugdispo" vs
"airtuerk Flugdispo"). A fair read puts genuine live quality ≈ 82–85% — **still a real
decline from the 92.9% human baseline**, concentrated in operational lookups.

## Root cause — the assumed lever is REFUTED by telemetry

The recon (and D-070, and code comments) blamed **priority-1 crowding** fixable by
raising `RERANK_INPUT_LIMIT`. Direct retrieval-layer telemetry says **that fix would do
almost nothing.** Evidence (probe: embed → `rag_hybrid_search` → simulate rerank):

- Candidate set is only **~67–69** total. With `RERANK_INPUT_LIMIT=40` the cut already
  reaches most chunks. Simulating "rerank ALL candidates" vs "rerank top-40" moved the
  answer-chunk into/out of the final-6 in **0** of the tested cases.
- For ETI-#1 (Stornierung) and Er-Car-#17 (ADB/IST numbers), the live answer **had
  topical context and still refused** — ETI cited storno for "Condor, ITT, ANEX, Er
  Car, Erboycar" but not ETI; Er Car cited the **priority-1 "Er Car +20% Servicegebühr"
  row** (a D-070 pin) instead of the confluence chunk with the actual numbers.

The real failure modes, from the answer-level telemetry:

1. **Pinned priority-1 rows win topical rerank slots over the specific operational
   chunk.** Of 31 priority-1 `company_context` rows, ~29 enter the rerank pool at a
   hardcoded `combined_score = 1.0`; only 2 (`mission`/`brand_voice`) are reserved as
   identity. The other 29 are mostly **generic background** — 10 `service_offering`
   (product/brand blurbs), 9 `team_structure` (org chart, **also** served live by the
   `query_team_directory` tool), 6 `mission`, 4 `process`. For "Er Car numbers" the
   reranker surfaces the Er-Car-*mentioning* pin, not the chunk with the digits.
2. **Over-conservative refusal.** Claude answers "das geht nicht eindeutig hervor" /
   "keine Informationen" when it has topical-but-not-exact context. Compounds (1).
3. **Recall gaps** for a few single-chunk facts (AurumTours not retrieved at all;
   CIZGI in candidates but never reranked top-6; IBAN/PayPal-Selin phrasings not in the
   keyword corpus). These are corpus/recall, separate from (1)/(2).
4. **A couple of genuine content errors** (Pegasus PNR format `Axxx` vs 6-stellig;
   Murat Sinim titled "Head of Operations" vs "Service-Center-Leiter").

## Candidate fixes — ranked, NOT yet applied (need sign-off / measured A/B)

Every one of these is now **measurable** via the harness (run before → apply → run
after). None shipped yet — they change demo-critical AI behaviour.

| # | Fix | Addresses | Risk | How to validate |
|---|---|---|---|---|
| F1 | **Demote `service_offering` + `team_structure` (≈19 rows) from priority-1 → priority-2.** Still vector-searchable; team facts already covered by the live directory tool. Frees the pinned slots that crowd operational chunks. | mode (1) | Low–med, **reversible** (one `UPDATE`, revert by re-setting priority). Prod data change → needs OK. | Set priority=2 for those rows → re-run harness → keep if pass-rate up, revert if not. |
| F2 | **Refusal-rule tuning** in the `rag-query` system prompt: answer from partial/topical context with a confidence hedge instead of a hard refusal. | mode (2) | **Med-high** — over-correction risks hallucination; touches the exact-phrase refusal contract the frontend depends on (`isOutOfScope`). Edge-fn redeploy. | Harness re-run + manual spot-check of the 6 `falsch` rows for new hallucination. |
| F3 | **Recall lift**: raise `RETRIEVAL_VECTOR_K`/`TRGM_K`, or re-chunk the single-chunk supplier pages so the specific fact embeds better. | mode (3) | Med, edge-fn/embed change. | Harness + the recall-miss probe set. |
| F4 | **Embed the 3 NULL-embedding `company_context` rows** (`embed-knowledge {source:'context'}`). Pure additive coverage. | minor | **Low**, additive. | One run; harness re-check. |
| F5 | **Content fixes** via the existing correction loop (Pegasus PNR, Murat title). | mode (4) | Low (content). | Harness re-check on those rows. |
| — | Raise `RERANK_INPUT_LIMIT` (the assumed fix) | — | — | **Refuted** — measured no effect. Do not pursue alone. |

**Recommendation:** F1 first (highest-leverage, reversible, measurable), then F4 + F5
(safe), then evaluate F2/F3 with eyes open. Re-run the harness after each and record the
delta here. The harness is the gate; do not ship a RAG change without a before/after.

## Open harness enhancements (post-baseline)
- Split the judge's `regression` into `refusal-regression` (objective) vs
  `content-nuance` (subjective) to sharpen the true-regression count.
- A `--frage` filter to replay specific questions without the full 84.
- Wire into CI behind a pass-rate floor once F1–F5 stabilise the number.

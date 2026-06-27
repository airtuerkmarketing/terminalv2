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

## D-100 — Fix experiments (measured, 2026-06-28)

Ran the harness as a gate around each change. **Result: the approved quick levers do
not move the number; the real story is a measurement confound + retrieval granularity.**

| change | applied | harness | verdict |
|---|---|---|---|
| **F1** demote `service_offering`+`team_structure` priority-1→2 (31→12 pinned) | UPDATE (prod) | **76.2% (64/84)** vs 77.4% baseline — **same questions fail** | **neutral → REVERTED** to priority-1=31 (no benefit; unvalidated downside on company/identity questions the gold set doesn't cover) |
| **F4** embed the 3 NULL `company_context` rows | `embed-knowledge {source:'context',force:true}` (prod) — NULL 3→0 | n/a (completes deferred D-070 backfill) | **KEPT** (harmless, regenerable, makes the demoted Selin row vector-searchable) |
| **F2** refusal-rule tuning | **NOT applied** | — | **reassessed as the wrong + risky lever — see below** |

**Key discovery — the 76% understates genuine quality.** Of the ~20 fails, ~5 are the
system **correctly refusing deliberately-purged secret data**: IBAN (#4, #5), credit
card (#8), Ryanair password (#7), PayPal SMS code (#23) all live on the
`SECRET_PAGE_DENYLIST` page `444009709` ("Operativ FAQ — passwords + cards + IBANs",
purged in the D1 security audit). The gold set predates the purge; the judge doesn't know
the denylist, so it scores correct security refusals as failures. Plus ~2 judge-strict
cases (TUIfly #21 gives a *richer* operator-routing answer missing the exact
`servicecenter@tuifly.com`; ETI #7 gives the correct `flug@eti.de` but mislabels
"ETI Flugdispo" vs "airtuerk Flugdispo"). **Adjusted genuine quality ≈ 84%** (≈71/84).

**Why F2 (refusal tuning) is now NOT recommended blind:**
1. The genuine remaining fails are **retrieval-granularity**, not over-refusal — the
   specific operational chunk (Er Car ADB/IST numbers, CIZGI email, AurumTours) isn't
   surfaced into the final-8; a "refuse less" prompt would make Claude *guess* → hallucinate.
2. ~5 refusals are **correct security behaviour**. A global refusal-loosening risks the
   system answering (or hallucinating around) purged passwords/cards/IBANs — unacceptable
   before a CEO/CFO demo.

**Real remaining levers (post-decision, each measurable via the harness):**
- **Denylist-aware harness** (do first): mark gold questions whose reference is on the
  secret denylist as `expected_refusal` (refusal = PASS), so the number reflects genuine
  quality and never penalises correct security behaviour. Also add company/identity
  questions (currently 0 in the gold set) so priority-1 changes like F1 can be validated.
- **F3 retrieval granularity**: re-chunk the single-chunk supplier pages and/or raise
  `RETRIEVAL_VECTOR_K`/`TRGM_K` so the specific operational fact reaches the final-8.
- **Validated content corrections** (D-070 pattern, needs fact sign-off): add confirmed
  facts as `company_context` (e.g. Pegasus PNR = 6-stellig alphanumerisch not `Axxx`;
  Y360 price in Euro not TL; Mavi Gök DE=DE/AYT, TR=rest). These directly fix
  `still_wrong` rows — but only with human fact-validation, not auto from the gold set.

**Net prod change from D-100:** F1 reverted (no net), F4 embeddings backfilled (data,
reproducible via the command above). No schema/migration change.

## D-103 — Denylist-aware harness (the honest number)

Implemented the security exception in the judge: a correct decline of deliberately-purged
secret data (full IBAN / credit-card / password) scores **PASS** as `secure_refusal` instead
of a false regression. Added a `--frage N,M` filter. Re-ran the full 84.

**Measured genuine pass rate: 82.1% (69/84)** (was 76.2% strict; supersedes the ~84% D-100
estimate). Breakdown: 62 correct · **4 secure_refusal** (ai_test_3 #4/#5 IBAN, #7 Ryanair pw,
#8 card) · 3 fixed · **11 regression** · 3 still_wrong · 1 uncertain. The exception is
correctly **scoped** — it fired only on the 4 genuine-secret refs, not on operational
questions, and #23 (PayPal "ask Selin" — not a secret) correctly stayed a regression.

**The real backlog (14 genuine gaps, no security confound):**
- **Retrieval-granularity (~9)** — the specific operational fact exists in the corpus but
  isn't surfaced into the final-8, so the system falsely refuses: ETI Stornierung (#1),
  Pegasus Medical/WCH (#5), WEGO Direktkunden-Storno (#26), Hara Filo contact (#14), Er Car
  ADB/IST (#17), CIZGI email (#21), Portal-Tagesstorno Widerrufsrecht (#6), AurumTours
  (#17 — a true recall miss, chunk not retrieved at all), PayPal→Selin (#23). → **F3**.
- **Content errors (~4)** — fact in the corpus is wrong/stale: Pegasus PNR `Axxx` vs
  6-stellig (#4), ETI email mislabel (#7), Mavi Gök DE/TR routing (#22), Mietwagen-Kaution
  (#28). → **validated content corrections** (D-070 pattern, needs fact sign-off).
- **Refusal-phrasing (1)** — Lufthansa storno (#27) used the wrong "out-of-scope" phrase
  instead of "no information". Minor prompt nuance.

This confirms the D-100 diagnosis with the honest number: the gap is **retrieval, not
crowding and not over-refusal**. Next: **F3** retrieval granularity, then the content
corrections. F2 refusal-tuning stays unnecessary (the false refusals are downstream of
retrieval — fix retrieval and they resolve).

## D-104 — F3 retrieval breadth (deployed, measured) → 86.9%

Offline experiment first (token-matched, no deploy): raising retrieval breadth + the rerank
window recovers "retrieved-but-cut" misses (Hara Filo, CIZGI) but **not** true recall misses
(Er Car, AurumTours — the chunk isn't retrieved even at m60/t30). *This corrected the D-100
"rerank-limit refuted" call* — that was based on unreliable keyword matching; with exact
tokens, widening the rerank window **does** recover some.

**Deployed** (`rag-query` v13): `RETRIEVAL_VECTOR_K` 20→60, `RETRIEVAL_TRGM_K` 10→30,
`RERANK_INPUT_LIMIT` 40→80. Lets the Voyage reranker see ~all candidates and surface the
specific operational chunk instead of it being cut below the ~31 pinned priority-1 rows.

**Measured (full 84): genuine 86.9% (73/84)** — up from 82.1% (+4.8 pts). 65 correct,
4 secure_refusal, 4 fixed, **8 regression** (was 11), 2 still_wrong, 1 uncertain. **5 real
recoveries** (Hara Filo, CIZGI, ETI Stornierung, Pegasus WCH, Mavi Gök), **no broad
regressions** (the one new flag, TUIfly #21, is the known borderline richer-answer case —
judge variance). Latency p50 5.2s→5.5s (+0.3s, acceptable). **Kept** (reversible: revert the
3 constants + redeploy).

**Remaining 10 gaps after F3:**
- **2 recall misses** (chunk not retrieved even at m60/t30): Er Car ADB/IST (#17),
  AurumTours (#17 t3). → re-chunk/re-embed those supplier pages (post-demo).
- **~6 content/granularity** (need fact sign-off or re-chunk): Pegasus PNR `Axxx` (#4),
  ETI email label (#7), Mietwagen-Kaution **(#28 — the one hallucination: asserts a security
  deposit; priority content fix)**, WEGO storno (#26), Portal Widerruf (#6), PayPal→Selin (#23),
  TUIfly direct email (#21). → validated content corrections (D-070 pattern).
- **1 phrasing**: Lufthansa (#27) uses the out-of-scope phrase instead of "no information".

## Open harness enhancements (post-D-103)
- Add company/identity questions to the gold set (currently operational-only) so priority-1
  / persona changes can be validated (F1 couldn't be, this sprint).
- Split `regression` into `refusal-regression` vs `content-nuance` to auto-route fixes.
- Wire into CI behind an 82% genuine-pass-rate floor once F3 + content corrections land.

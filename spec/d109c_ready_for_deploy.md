# D-109c — READY_FOR_DEPLOY

Master-3 (v19 build) is complete and on `main`. The edge function is **not** deployed —
prod still serves `rag-query` **v18**. This document is the deploy gate hand-off for
Master-4 (v19 edge-fn deploy), which needs explicit owner sign-off.

## Master-3 — complete, 7/7 commits

| # | Hash | What |
|---|---|---|
| M3.0 | `67befee` | `detectLang` word-count-primary (Case-9 "Malmö" baseline bug); inlined in `rag-eval.ts` + `index.ts` |
| M3.1 | `8bde370` | #1 source-fidelity QUELLENTREUE block (Rules 1-5 + 5b/5c/5d) in `WEB_SEARCH_PROMPT` |
| M3.2 | `f888aa8` | #2 anti-sycophancy (Rules 6-9) + Rule 10 (omit prose "Quellen:" line) |
| M3.3 | `fab68d4` | #2.5 native-citation parser (`citations_delta`) → streamed localized verified-source block + tool-failure log |
| M3.4 | `f908acd` | #3 explicit-sticky web-search frontend (composer "Web-Suche aktiv" pill + `[exit]` + 5-min idle self-clear) |
| M3.5 | `f16b5a3` | #3b contradiction-hint backend safety net + **H3** source-block gate (follows actual `web_search` usage) |
| M3.6 | `5e07366` (hardened `93c7d3e`) | #4 + F-D suppress duplicate source chips on web-search turns + tier-2 honest loading copy |

Supporting: `897e6eb` BUILD_LOG sync; `93c7d3e` F-D deploy-order hardening (see below).

## Gates — final state (all green)

- **`tsc --noEmit`** (`pnpm typecheck`): 0 errors.
- **`next build`** (`pnpm build`): ✓ Compiled successfully, all routes generated.
- **`deno check --node-modules-dir=auto supabase/functions/rag-query/index.ts`**: **15 errors**,
  matching `spec/deno-baseline-v18.txt` exactly — Family A (8: `TS2322`×3 + `TS2345`×5) +
  Family B (7: `TS2353`×4 + `TS2339`×3). **No new error family.** (These are the pre-existing
  untyped-`SupabaseClient` results documented in the baseline; out of scope to fix.)
- **1-case smoke** (`rag-eval --set D-109c-behavioral --against v18 --limit 1`): exit 0 — the
  M3.0-patched harness runs end-to-end (auth → replay through live v18 → Sonnet judge → prod
  session self-cleanup). Result `0/1` is the **expected v18 floor** (the fixes activate only at
  v19); `REGRESSION (right→wrong): 0` confirms no harness regression. This was a harness-sanity
  check, not a quality measurement.

## H3 decision — logged

The verified-source block is emitted on:

```ts
if (webSearch && (mode === 'web-search' || webSearchUses > 0)) { … }
```

i.e. the block **follows actual `web_search` usage, not the mode flag** (the **proper route**,
not the degraded mode-only fallback). Explicit web-search mode is unchanged (always emits, incl.
the "Keine verifizierten Quellen." fallback); a contradiction-hint *default* turn (M3.5) appends
the block **only if the model actually searched** (`webSearchUses > 0`), so a pure-RAG default
answer never gets a spurious empty source block.

## F-D — keyed on block presence (deploy-order safe)

F-D suppresses the source chips **only when the deterministic #2.5 block is actually present in
the answer text** (a `<Label>:\n- …` citation list or the localized "no verified sources"
fallback). This is **self-synchronizing with the backend**: the frontend (M3.4/M3.6) auto-deploys
on push to `main` while `rag-query` stays v18, and v18 does not yet stream the block. Keying on the
block's presence means:

- against **v18** (no block) → chips still render as the only source surface (no regression in the
  deploy window);
- once **v19** streams the block → chips are suppressed (the block is the single surface).

The earlier flag-based signal (`turn.isWebSearch` / web_search-source presence) would have hidden
chips against v18 *before* the block existed, briefly leaving web-search answers with no source
surface at all — fixed in `93c7d3e`. Regexes empirically verified (all 6 v19 block shapes suppress;
v18 answers, default-RAG inline `[Quelle:]`, and Rule-3 uncertainty phrasing do not).

## Known limitation (per spec — owner visibility)

M3.5 makes the `web_search` tool **available** on a contradiction-hint default turn but does **not**
inject the anti-sycophancy Rules 6-9 (those live in `WEB_SEARCH_PROMPT`, not `buildSystemPrompt`).
So re-verification is at the **model's discretion** — if it declines to search, no re-verification
happens (unlike explicit web-search mode, which mandates it). This is the intended "backend safety
net" semantics; the primary anti-sycophancy mechanism remains M3.4's frontend explicit-sticky mode.

## Prod state

- **Edge fn `rag-query`: v18** (unchanged). M3.0–M3.3 + M3.5 only activate on the v19 deploy.
- **Frontend (M3.4 + M3.6 + `93c7d3e`):** on `main`; Vercel redeploys production on push. F-D's
  block-presence keying keeps it correct against the still-live v18 backend.

## Adversarial review (this wave)

Two read-only review passes (8 lens-runs total) on the M3.5 and M3.6 diffs before they landed:

- **M3.5** (4 lenses): every flagged blocker/major was adjudicated to a false positive or a
  spec-intended non-defect. The sole `isRealDefect`-claimed blocker ("contradiction regex never
  matches") was **empirically disproven** — `/\n(Quellen|Sources|Kaynaklar):\n/` matches `\n\n…:\n`
  as a substring. Shipped as-is.
- **M3.6** (2 Sonnet lenses): default-RAG chips, separator, and rehydration shape confirmed correct.
  One **genuine** finding (a live contradiction-hint turn would show chips alongside the block until
  reload) — **closed** by the block-presence hardening (`93c7d3e`), which also incidentally fixed the
  larger deploy-order regression found in final analysis.

## Outstanding before Master-4 (v19 deploy)

- **Owner explicit go** for the `rag-query` v19 edge-fn deploy (+ optional `rag-query-canary` first).
- After v19 is live: the v19 X→Y eval run (Master-5/8) to measure the fixes against the v18 baseline
  (`spec/baseline_v18_runs.md`: X_behavioral 54.2% σ5.9 / X_deterministic 0% floor, n=3).

## Pre-Master-5 reminder

- Case 6 `asks-source` assertion tightening (the und/oder judge-inconsistency) — a 1-row gold-set
  `UPDATE`, no re-baseline — to land **before** the post-fix run.

## Rollback targets

- **Edge fn:** prod is v18 (anchor `8f10b10`); no deploy yet, so rollback is N/A until v19 ships. If
  v19 is deployed and must be reverted, redeploy the v18 source (`8f10b10`).
- **Frontend:** revert `93c7d3e` + `5e07366` (M3.6) + `f908acd` (M3.4) to remove the web-search UX
  changes. (M3.5 `f16b5a3` is edge-fn-only — not in the frontend bundle.)

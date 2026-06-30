# D-109c Master-3 Handoff — M3.4 complete, 5/7 done

Session terminated at token-emergency post-M3.4.

## Progress
- M3.0 detectLang ✓ 67befee
- M3.1 source-fidelity Rules 1-5+5b/5c/5d ✓ 8bde370
- M3.2 anti-sycophancy Rules 6-10 ✓ f888aa8
- M3.3 native citations + SSE block ✓ fab68d4
- M3.4 explicit-sticky frontend ✓ f908acd
- M3.5 contradiction-hint backend PENDING
- M3.6 tier-2 loading text PENDING

(NOTE: M3.5 code was drafted this session then reverted for a clean stop — re-implement from the spec below. Working tree is clean at f908acd. BUILD_LOG Master-3 stubs go up to M3.3; add M3.4/M3.5/M3.6 stubs as you commit — Beifang per §4.3.)

## M3.5 spec (next, edge fn)
File: supabase/functions/rag-query/index.ts — add `detectContradictionSignal` next to `detectLang`
(just above `const CORS_HEADERS`), and wire the hint into the DEFAULT-mode dispatch (just before the
final `streamClaudeResponse({... mode ...})` call, ~line 300 post-M3.3).
Add detectContradictionSignal(userMsg, priorAssistantMsg):
  regex /\b(nein|nope|stimmt nicht|falsch|doch nicht|incorrect|wrong|that'?s not right)\b/i
  AND priorAssistantMsg non-empty
If mode==='default' + signal + prior turn had web_search (detect via prior assistant message
  containing the appended source block /\n(Quellen|Sources|Kaynaklar):\n/):
  pass `webSearch: true` to streamClaudeResponse (it adds WEB_SEARCH_TOOL to the toolset).
console.info('contradiction-hint: re-engaging web_search')
Gates: deno (≤15, no new family) + typecheck

## M3.6 spec (last, frontend)
File: src/components/dashboard/hero/AIAnswerBlock.tsx lines 59-68 (WEB_SEARCH_LOADING_TIER2)
Tier-1 unchanged
Tier-2 (8s timer): replace de text with:
  "Mehrere Quellen werden gegengelesen — kann bis 30 Sekunden dauern."
Gates: typecheck + build + deno

## F-D (NOT yet implemented — do before READY_FOR_DEPLOY)
F-D "suppress source chips in web-search mode" is NOT in M3.0-M3.4. Add to AIAnswerBlock: when
`turn.isWebSearch` (live) / `message.mode === 'web-search'` (rehydrated), hide the source chips — the
streamed deterministic source block (#2.5) is the single source surface. Fold into M3.6 or a small M3.7.

## After M3.6 (+ F-D): READY_FOR_DEPLOY
Final full gates: pnpm typecheck + pnpm build + deno check (≤15, no new family)
Report "READY_FOR_DEPLOY" — owner gives explicit go for Master-4 deploy (v19 edge fn + Vercel).
DO NOT deploy until then. v18 stays prod.

## Key locked decisions (preserved)
- C1-C5 all applied in M3.0-M3.3 (C1 citations=web_search_result_location via citations_delta;
  C2 Case-7 predicate; C3 block streamed via SSE; C4 detectLang inlined both runtimes; C5 det judge
  reuses behavioral_pass category)
- F-A localize de/en/tr via detectLang ✓ (M3.0 fixed Malmö bug; M3.3 localizes the source block label)
- ADD-2: baseline split X_behavioral 54.2% (σ5.9) / X_deterministic 0% (floor)

## Gate strategy (continue)
- Edge-fn-only (M3.5): deno + typecheck (build skipped — index.ts excluded from Next build)
- Frontend (M3.6, F-D): typecheck + build + deno

## Outstanding
- Case 6 `asks-source` assertion UPDATE deferred to pre-Master-5 (judge-inconsistency on the und/oder
  wording; 1-row gold-set UPDATE, no re-baseline)
- detectLang fix already shipped (M3.0) — Case 9 will measure cleanly at v19
- Parallel branch `fetaure/goldset` on origin (not main) — possible parallel gold-set work; ignore until post-demo
- Baseline reference commit: 5f1050f; baseline doc: spec/baseline_v18_runs.md

## Recovery
Fresh session: read this file + CLAUDE.md + spec/baseline_v18_runs.md + spec/d109c_board_scenarios.md
+ the plan C:\Users\marketing\.claude\plans\stay-on-main-ebenewaswann1-giggly-cake.md (REWORK v4, has
all verbatim specs). Confirm `git log -1` == f908acd, tree clean. Then start M3.5.

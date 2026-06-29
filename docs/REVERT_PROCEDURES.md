# REVERT_PROCEDURES.md — rag-query / D-106 rollback runbook

Insurance for the **D-106** deploy (generation model Opus 4.8 → **Sonnet 4.6**, plus the working
web-search fallback, chip preamble, and strict DE/EN/TR language mirroring). Three independent
rollback paths, ordered **surgical → nuclear**.

> **Status (2026-06-29):** we are **KEEPING Sonnet** — the eval delta (−2.4 pp, 84.5% vs 86.9%) was
> accepted. This document is **documented insurance, not an active rollback.**
>
> **Authorization:** Rollback execution requires Buhara's **explicit approval**. Do NOT self-authorize,
> even under demo pressure.

## Ground truth at authoring (verify before acting — docs drift)

- **Frontend (Vercel):** project `terminalv2`, prod deployment serving `www.airtuerk.dev` /
  `airtuerk.dev`, commit `b5aeb0a`, region `fra1`.
- **Edge:** `rag-query` **version 14**, `verify_jwt: true`, project ref `zkydrymygjrscjbhusxp`.
- **Model constant:** `supabase/functions/rag-query/index.ts:38` →
  `const ANTHROPIC_MODEL = 'claude-sonnet-4-6'`.
- **Web tool:** `index.ts:94–98` → `{ type:'web_search_20260209', name:'web_search', max_uses: <3 after Phase 1.5a, was 5> }`.
- **Web-search mode branch:** `index.ts:206–223`; tool push: `index.ts:721`.
- **Button render gate:** `src/components/dashboard/hero/AIAnswerBlock.tsx:158–162` (gated on `isOutOfScope`).
- **Scope of `b5aeb0a`:** 10 files, incl. the **new** `src/lib/rag/preamble.ts`.

## Invariants for ANY edge redeploy (do not violate)

1. **`verify_jwt` MUST stay `true`.**
2. Edge function **versions only increment** — "redeploy v13" means *deploy v13's source*, producing a
   **new** version number carrying v13 behavior. You cannot re-activate an old version number in place.
3. Prod edge deploys + prod DB writes require **explicit owner sign-off** (CLAUDE.md).

**Deploy mechanism (either):**
- Supabase MCP `deploy_edge_function` (`project_id: zkydrymygjrscjbhusxp`, `slug: rag-query`, `verify_jwt: true`).
- CLI: `supabase functions deploy rag-query --project-ref zkydrymygjrscjbhusxp` (verify_jwt from config).

---

## PROCEDURE A — Model-only rollback (Sonnet 4.6 → Opus 4.8)

**When:** generation-quality regression is unacceptable, but you want to keep web-search + preamble +
language mirroring. **Est. downtime:** ~0 (rolling edge redeploy, ~30–60 s). Frontend untouched.
**Web-search keeps working** — `web_search_20260209` is supported on Opus 4.8.

```
1. Edit supabase/functions/rag-query/index.ts:38
     - const ANTHROPIC_MODEL = 'claude-sonnet-4-6'
     + const ANTHROPIC_MODEL = 'claude-opus-4-8'
2. Redeploy rag-query  (verify_jwt:true preserved)  — MCP deploy_edge_function or supabase CLI
3. Commit:  revert(rag): ANTHROPIC_MODEL Sonnet 4.6 -> Opus 4.8 (D-106 model rollback)
4. Smoke (3 in-scope DE questions → expect 200 stream + corpus sources):
     - "Was macht die airtuerk Service GmbH?"
     - "Wie storniert man bei ETI?"
     - "Welche Konditionen gelten für EasyJet-Umbuchungen?"
```
> **Version vs content:** the redeploy creates a **new** version number (e.g. v15) — this is normal;
> the Opus-restored code now lives at the new version. Verify the rollback by the resolved
> `response.model` field in a test call, **not** by the edge-function version number.

**Expected:** answers come from Opus again; web-search button still works; preamble unchanged.
**Reverse it:** set the constant back to `'claude-sonnet-4-6'` + redeploy.

---

## PROCEDURE B — Web-search-only rollback (disable the feature)

**When:** web-search misbehaves (latency, pause_turn, source quality) but Sonnet generation is fine.
**Est. downtime:** edge redeploy (~30–60 s) + Vercel build (~2–3 min). **Default order — frontend first (see Race-Window).**

> **Race-Window:** between edge-disable and Vercel-deploy there is a ~2–3 min window where the
> frontend still shows the button but the edge ignores web-search mode → a user click falls through to
> default RAG and may produce a confusing answer.
> **Recommended (non-urgent regression):** do **FRONTEND first** (steps 4–5 — button gone immediately
> on Vercel ready), then **EDGE** (steps 1–3 — backend gracefully ignores the already-gone trigger).
> Use **edge-first only if web-search is actively breaking users** (a 2–3 min confusing-answer window
> beats continued breakage).

```
EDGE  (supabase/functions/rag-query/index.ts)
  1. mode==='web-search' branch (~206–223): stop passing webSearch:true downstream
       (fall through to default RAG, or return the rule-7 refusal without the web path).
  2. tool push (~721): guard so WEB_SEARCH_TOOL is never added to the tools array.
  3. Redeploy rag-query (verify_jwt:true).
FRONTEND  (src/components/dashboard/hero/AIAnswerBlock.tsx:158–162)
  4. Hide the "search the web" button (gate render to false / drop the onWebSearch wiring).
  5. next build  →  deploy to Vercel.
```
**Smoke:** an out-of-scope question shows the refusal **without** a web-search button; in-scope RAG
unaffected. **Reverse it:** revert both edits + redeploy edge + frontend.

---

## PROCEDURE C — Full rollback to pre-`b5aeb0a` (nuclear)

**When:** a systemic problem spans D-106. **Est. downtime:** git revert + edge redeploy + Vercel build
(~3–5 min).
> ⚠️ `git revert b5aeb0a` reverts **all 10 files** — including the D-106 docs (DECISIONS/BUILD_LOG) and
> the new `preamble.ts`. Prefer A or B (surgical); use C only for a broad failure.

```
1. git revert b5aeb0a        # restores pre-D-106 frontend + edge source (resolve any conflicts)
2. Redeploy rag-query from the reverted source  → restores v13 behavior
     (= Opus 4.8, German-only protocol phrases, NO web search). verify_jwt:true.
     NOTE: this creates a new version number carrying v13 content (versions only increment).
3. next build  →  deploy frontend to Vercel.
4. Verify: a turn is answered by Opus; NO web-search button; NO chip preamble.
```
**Smoke:** 3 in-scope DE Qs (200 + sources) + confirm the web-search button is gone.
**Reverse it:** `git revert` the revert commit + redeploy edge + frontend.

---

## Post-rollback verification (all procedures)

- `list_edge_functions` → `rag-query` `ACTIVE`, `verify_jwt: true`, **new** version number.
- One authenticated `POST /functions/v1/rag-query` → **HTTP 200** stream.
- Edge logs (`get_logs edge-function`) → no new `5xx`.
- (A/C) confirm the served model is Opus via a turn; (B/C) confirm the web-search button is gone.

**Semantic verification (not just "is it alive"):**
- **A:** the resolved `response.model` must equal `'claude-opus-4-8'` (authenticated POST to
  `rag-query`, read the stream's model field). If it still returns `'claude-sonnet-4-6'`, the rollback
  did **not** apply — likely a cache/build issue, **not** a Supabase deploy issue.
- **B:** an out-of-scope **EN** question → the refusal turn renders **WITHOUT** the button. If the
  button still shows, the Vercel cache hasn't invalidated.
- **C:** a **translate-mode** question → the chip preamble is **ABSENT** (pre-D-106 behavior). If the
  preamble still renders, the revert missed `preamble.ts`.

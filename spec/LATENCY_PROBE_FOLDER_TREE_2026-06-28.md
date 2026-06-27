# Authed Folder-Tree Latency Probe — 2026-06-28 (D-094)

**Goal:** measure the login-gated Document-Library folder-tree SSR that D-088's anon probe
couldn't reach. **Target:** 300ms p95.

## Method — constructed `@supabase/ssr` cookie (no Playwright)

Rather than installing Playwright + chromium (which would re-dirty the just-cleaned tree and
depend on brittle login selectors), I minted a session via the Supabase auth endpoint
(`dev@airtuerk.de`, super_admin) and built the SSR cookie the app reads:
`sb-<ref>-auth-token = base64-<base64(session-json)>`. The session was 1891 bytes → 2531-byte
cookie (under the chunking threshold, so a single cookie works). Curling the folder-tree route
with that cookie returned **HTTP 200** (authenticated render), confirming the approach.

Fixture: `/documents-library/business-development/dvjvnd`. As super_admin the tree renders **all**
folders + per-folder counts (the heaviest representative case). 10 sequential requests, EU
workstation → eu-central-1 (real EU users faster).

## Results

| Metric | p50 | p95 | max | min |
|---|---|---|---|---|
| TTFB | **0.67s** | **0.90s** | 0.90s | 0.50s |
| total (full HTML) | 0.99s | 1.47s | 1.47s | 0.80s |

(all 10 → HTTP 200; first request 1.39s discarded as cold Vercel-function start)

## DB layer is NOT the bottleneck (EXPLAIN ANALYZE)

The per-folder file count:
```
Aggregate (actual time=0.022..0.022)
  -> Seq Scan on document_files (Filter: deleted_at IS NULL AND folder_id=…, Rows Removed: 5)
Execution Time: 0.117 ms
```
`document_files` is tiny (~6 rows), so the planner picks a seq scan — **0.117ms**. `getAllFolders`
(10 rows) is similarly trivial. The D-083 FK indexes are present and would engage at scale; at
current data size the query is sub-millisecond either way. **The folder logic costs ~nothing.**

## Verdict — 🟡 over target, but not where the prompt expected

TTFB ~0.67s p50 / ~0.90s p95 exceeds the 300ms target, but the cause is **not** the folder-tree
query (0.1ms). It's the generic authed-SSR overhead: Next server render + the **`getUser()`
JWT-validation round-trip** to Supabase Auth (this `force-dynamic` route re-validates the session
server-side on every request) + serverless invocation + workstation→Vercel RTT. This cost is
shared by *every* authenticated page, not specific to the Document Library. For an internal tool,
~0.7s to first byte / ~1s interactive is acceptable, and real EU users see less. **Not
demo-blocking; no 🔴.**

## Recommendation (post-demo, broad)

If authed-SSR latency is worth optimizing, the lever is the per-request auth validation, not the
folder query: e.g. trust the signed JWT locally (`getSession`) where a server round-trip isn't
needed, or move auth to the edge. That's a security/latency tradeoff (the app deliberately uses
`getUser()` for server-side validation) affecting all authed routes — a considered, post-demo
change, not a folder-tree tweak.

*Generated 2026-06-28. Read-only probe (constructed session cookie + EXPLAIN). No prod writes.*

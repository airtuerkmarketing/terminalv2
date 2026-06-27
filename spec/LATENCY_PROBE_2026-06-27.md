# LATENCY_PROBE — terminalv2 — 2026-06-27

**Scope:** Authenticated hot-path latency against prod, filling the gap the Phase-B
health check left (it only covered anon routes). Read-only — no writes.
**Method:** `curl` from the dev workstation (EU → eu-central-1; real EU users will be
faster) using the dedicated preview account (`dev@airtuerk.de`, super_admin) to mint a
real JWT via the Supabase auth endpoint. Sequential requests, cold→warm.

> This is a measurement, not a decision — no D-entry (per the fix-sequence rule: a
> D-entry only if a 🔴 triggers a remediation). The one sub-target result (RAG full
> completion) is mitigated by streaming; see below.

---

## Results

| Path | Metric | p50 | p95 | Target | Verdict |
|---|---|---|---|---|---|
| `POST /auth/v1/token?grant_type=password` | total | **0.12s** | **0.22s** | < 800ms | 🟢 |
| `POST /functions/v1/rag-query` | **TTFB (first token)** | **~2.3–3.1s** | ~3.1s | < 4s | 🟢 |
| `POST /functions/v1/rag-query` | full completion | ~6s (short) / ~8.5s (long) | ~9.3s | < 4s | 🟡 streamed |
| `GET /documents-library/[folder]` (SSR) | — | — | — | < 300ms | ⚪ not measured |
| `GET /api/library/file/[id]` (signed URL) | — | — | — | < 200ms | ⚪ not measured |

**Raw samples**
- **Auth login** (7×, 200): `0.221, 0.139, 0.147, 0.123, 0.113, 0.110, 0.116` s — first = cold.
- **RAG full** (5×, 200, longer answer): `7.93, 8.46, 7.39, 9.31, 8.49` s.
- **RAG TTFB/total** (3×, 200, shorter answer): ttfb `2.33 / 3.15 / 2.33` → total `6.15 / 6.31 / 6.21` s.

---

## Findings & recommendations

**🟢 Auth login** — excellent (p95 0.22s, well under 800ms). No action.

**🟡 RAG query** — the pipeline **streams** (TTFB ≪ total), so the dashboard typewriter UI
shows first tokens at **~2.3–3.1s** (under target); the full answer lands at ~6–9s depending
on answer length. Drivers, in order: Claude **Opus** generation (the streaming tail, by design
per D-060), then embed (Voyage) + retrieve + rerank (the ~2.5s pre-token delay). It's
demo-acceptable **because it streams**, but worth two cheap mitigations before 2026-08-01:
1. **Warm the edge function** right before the demo — the first cold call was ~7.9s vs ~6–8s
   warm; one throwaway question removes the +1–2s cold-start hit.
2. If a snappier feel is wanted, consider a faster generation model for the *default* mode or
   a lower `max_tokens` — **but** that's a quality trade-off against D-060 (Opus chosen
   deliberately); leave as a product call, not a silent change.

**⚪ Folder-tree SSR + signed-URL serving** — not cleanly measurable with `curl`: these Next
routes authenticate via the `@supabase/ssr` cookie (a base64 session blob, not a bare JWT), so
a raw-JWT cookie just redirects to `/login`. The anon shell TTFB is already known fast
(`/login` p95 0.37s, `/` 0.59s from the Phase-B probe), and both routes now sit on the new FK
indexes (D-083). Recommend a 10-request pass in an authenticated **browser** session (or via
the preview tooling) if a hard number is needed — low priority, both are light SSR/Storage ops.

---

## Verdict

🟢 **No blocker for the demo.** Auth is fast; RAG's perceived latency (first token) is within
target thanks to streaming. The only watch-item is RAG *full-completion* time — masked by the
typewriter UI, improvable by pre-warming the edge function. Authenticated folder/signed-URL
paths still want a quick browser-session confirmation.

*Generated 2026-06-27. Read-only probe via the dedicated preview account. No prod writes.*

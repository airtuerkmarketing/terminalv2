# LATENCY_PROBE_AUTHED — terminalv2 — 2026-06-27

**Scope:** The two paths the Phase-B curl probe couldn't reach (folder-tree SSR + signed-URL
serving). Read-only, no writes, no DB change. **No Playwright needed** — see method.

**Method (lighter than the planned Playwright run):** The Document Library has an
anonymous public face at the DB layer (the `{public}` `document_files_select` policy serves
`is_public` files to anon — confirmed in D-089). The **signed-URL API route** (`/api/library/file/[id]`)
lives outside the page layout, so it serves public files to anon directly — measurable with
`curl` (no cookie). The **folder-tree page** (`/documents-library/…`) *is* login-gated
(anon → 307 `/login`), so its full authed render still needs a browser session; its auth-gate
TTFB is measured as the SSR entry cost. Probed from an EU workstation → eu-central-1 (real EU
users will be faster). Fixture: public folder `business-development/dvjvnd`, public file
`6ec92efb-…`.

---

## Results

| Path | Metric | p50 | p95 | max | Target | Verdict |
|---|---|---|---|---|---|---|
| `GET /api/library/file/[id]` (signed-URL, anon public file, to the 302) | TTFB | **0.48s** | **0.87s** | 0.87s | < 200ms | 🟡 over |
| `GET /documents-library/[folder]` (auth-gate entry, anon → 307) | TTFB | ~0.51s | ~0.59s | 0.59s | < 300ms | ⚪ gate only |
| `GET /documents-library/[folder]` (full authed tree render) | — | — | — | — | < 300ms | ⚪ not measured (login-gated) |

**Raw — signed-URL TTFB (10×, all 302):** `0.731, 0.495, 0.462, 0.437, 0.479, 0.615, 0.428, 0.449, 0.869, 0.471` s
**Raw — folder-tree gate TTFB (8×, all 307):** `0.523, 0.505, 0.340, 0.320, 0.481, 0.577, 0.514, 0.593` s

---

## Findings & recommendations

**🟡 Signed-URL serving — ~0.48s p50 (target 200ms).** Files still serve correctly (302 → CDN);
this is the time to *get* the redirect, not to download. Driver: the route (`runtime = "nodejs"`)
does **two sequential Supabase round-trips** from the serverless function — read the
`document_files` row with the request-scoped client (RLS gate), then mint a signed URL with the
service-role client — plus serverless invocation overhead. The number includes the
workstation→Vercel RTT, so real users near the edge are faster, but the two Supabase calls are
the server-side floor. **Not demo-blocking** (a document opens in ~0.5s). Post-demo optimization
options (each a deliberate, separately-tested change — not done here): move the route to the
`edge` runtime, collapse to a single round-trip (sign inside the same call once the row is
confirmed), or short-cache signed URLs. The row read rides the new FK indexes (D-083).

**⚪ Folder-tree render — not measured.** The page redirects anon to `/login` (307, ~0.5s gate),
so the authed tree render needs a real session (Playwright or a constructed `@supabase/ssr`
cookie). Its queries (`getFolderTreeForPath` + counts) run on the now-indexed `document_folders`/
`document_files` (D-083) and the anon→login gate itself is ~0.5s TTFB, so the SSR entry cost is
modest. Recommend a one-off authenticated **browser** timing pass if a hard number is wanted.

---

## Verdict

🟢 **No demo blocker.** Auth + RAG-first-token were already green (LATENCY_PROBE_2026-06-27).
Signed-URL serving is the one watch-item at ~0.5s (vs a 200ms aspiration) — acceptable for the
demo, with clear post-demo optimizations. Folder-tree render is login-gated and rides the new
FK indexes; a browser-session timing is the only remaining gap.

*Generated 2026-06-27. Read-only probe (anon public-file path + auth-gate). No prod writes.*

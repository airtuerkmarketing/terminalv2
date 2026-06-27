# Auth Strategy / Authed-Latency Audit — 2026-06-28 (D-095)

**Plan as drafted:** swap read-only SSR routes from `auth.getUser()` (server round-trip) to
`auth.getSession()` (local signature check) to cut the ~0.67s authed TTFB D-094 measured.

**What recon found (premise override):** the bottleneck is **not** `getUser` specifically — it's
that the Vercel serverless functions run in **`iad1` (US East)** while Supabase is in
**`eu-central-1` (Frankfurt)**, so *every* Supabase call from a function is a transatlantic
round-trip (~80–100ms). The fix is **co-location**, which beats the `getSession` swap by ~25×.

## getUser() inventory + classification

| Callsite | Class | Decision |
|---|---|---|
| `src/lib/supabase/middleware.ts` (proxy `refreshSession`) | MIDDLEWARE / security boundary | keep `getUser` |
| `src/lib/auth.ts` `getIdentity()` | read **and** admin-gate (`requireAdmin`/`requireSuperAdmin` call it) | keep `getUser` |
| `src/app/admin/layout.tsx` | ADMIN_CHECK | keep `getUser` |
| `src/app/login/update-password/actions.ts` | MUTATING | keep `getUser` |
| `src/app/login/page.tsx`, `.../update-password/page.tsx` | login-flow gate | keep `getUser` |
| `src/lib/rag/client.ts` | RAG (already mixes get/session) | unchanged |

**Key blocker for the original plan:** `getIdentity()` is the single per-request identity source
used by *both* read-only rendering *and* the admin gates. Switching it to `getSession()` would
make `requireAdmin()` trust a signed-but-possibly-revoked token for up to the token lifetime — a
security regression on admin paths. Splitting it into a read-only variant was possible but, given
the next finding, not worth it.

## The real bottleneck — function region

`terminalv2` Vercel `serverlessFunctionRegion` = **default `iad1`** (US East). Supabase project =
**`eu-central-1`** (Frankfurt). The folder-tree page alone makes ~4 Supabase round-trips
(`getIdentity` → `getUser` + `profiles` read; `getFolderTreeForPath` → `getAllFolders` + N counts),
each ~80–100ms transatlantic. The signed-URL route makes 2. `getUser` is one of many.

## Fix — `vercel.json` `regions: ["fra1"]`

Co-locate the functions with Supabase (fra1 = Frankfurt). **Zero app-code change, zero security
risk, reversible.** Speeds up every authed route + the signed-URL route at once.

| Path | Before (iad1) | After (fra1) | Δ |
|---|---|---|---|
| Folder-tree authed TTFB p50 | 0.67s | **0.27s** | −60% |
| Folder-tree authed TTFB p95 | 0.90s | **0.38s** | −58% |
| Signed-URL TTFB p50 | 0.48s | **0.30s** | −37% |
| Signed-URL TTFB p95 | 0.87s | **0.44s** | −49% |

Measured on prod (EU workstation), 10× each, warm. EU demo users (Ümit/Ahmet, close to fra1) see
an even larger improvement. The preview deploy was Vercel-SSO-protected (→ `vercel.com/sso-api`,
unmeasurable), so this was verified on prod with `git revert` as the instant safety net.

## Why `getUser → getSession` was NOT pursued

Once functions are co-located, each round-trip is ~15ms. Dropping the one `getIdentity` `getUser`
round-trip would save ~15ms — not worth weakening `requireAdmin()`'s server-side
token-revocation check. `getUser` stays everywhere, including the proxy security boundary.
(If a future need arises, the clean path is a dedicated read-only identity helper using
`getClaims()` for non-gating renders — logged for post-demo.)

*Generated 2026-06-28. Premise-first recon overrode the drafted plan (lesson #1).*

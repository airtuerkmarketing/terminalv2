# UX State Audit — 2026-06-28 (D-098)

**Bar (per the prompt):** "Ümit wouldn't notice anything embarrassing" — not world-class polish.
Method: read the route-segment special files + the demo-path components' empty/error branches, and
exercise the live flows (the D-096 E2E already passes all 5 demo flows green).

## State coverage (demo-path first)

| Route / area | Cold paint | Empty data | Error | 404 | Verdict |
|---|---|---|---|---|---|
| `/` (home + AI chat) | — (instant shell) | n/a | AI errors caught → shown on the turn (`SearchAIBox` try/catch + `patchTurn({error})`) | root `not-found.tsx` | 🟢 |
| `/documents-library/*` | `(public)/loading.tsx` skeleton | `.dl-empty` "This folder is empty / No files here yet" | `(public)/error.tsx` ("Something went wrong" + Try again / Back) | root `not-found.tsx` | 🟢 |
| `/presentation-hub/*` | `(public)/loading.tsx` | mirrors documents (same construct, D-077) | `(public)/error.tsx` | root | 🟢 |
| File open (`/api/library/file/[id]`) | n/a | 404 on missing/forbidden (RLS) | 502 on sign failure | — | 🟢 |
| `/login` | instant | n/a | inline `.login-error role=alert` | — | 🟢 |
| `/admin/*` (user mgmt, knowledge) | **was blank** → **fixed: `app/admin/loading.tsx`** | per-table empty states exist | root `error.tsx` | root | 🟢 (fixed) |

The root `error.tsx` + `(public)/error.tsx` cover server/render errors with a styled card; the
`(public)/loading.tsx` covers slow data with an accessible skeleton (`aria-busy`); `not-found.tsx`
covers 404. The AI chat — the demo hero — catches both stream-event errors and fetch failures and
renders them on the turn rather than crashing.

## Fixed this batch

- **`app/admin/loading.tsx`** (🟡→🟢): `/admin/*` had no Suspense fallback, so navigating into
  User-Management / Knowledge showed a blank white frame until the server component resolved
  (noticeable now that functions are fast but not instant). Added a skeleton mirroring the
  `(public)` one. Zero logic, zero risk.

## Audited as already-good (no change)

Loading skeletons, error boundaries, empty-folder copy, login inline errors, AI-chat error
capture, 404 — all already present and graceful. The earlier batches' work (D-074+ Document
Library, D-065+ Wissensbasis) shipped these states.

## Deferred (post-demo, design judgment — not "embarrassing")

- The empty/loading states are functional but plain (neutral skeleton, simple copy). A branded
  empty state with an illustration/CTA, or a first-run tour on the AI chat, would be nicer — but
  that's design polish, out of scope for "don't embarrass" hardening.
- `/admin/users`, `/admin/knowledge` could get route-specific skeletons matching their table
  layouts (vs the generic one) to reduce layout shift — minor.

## Verdict

🟢 **No 🔴 on any demo-path route.** One 🟡 fixed (admin cold paint). The rest is graceful. The
D-096 E2E suite is the ongoing guard against regressions over the next 5 weeks.

*Generated 2026-06-28. Audit by code-read + live E2E (D-096), per "telemetry/existing-coverage over fresh tests".*

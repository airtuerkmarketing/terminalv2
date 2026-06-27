# Duty Free — 21st.dev registry URLs (B0.5)

Resolved registry install URLs for the 6 authoritative components (master-plan §1).
The **community URL** is for humans to view source; the **install URL** (`/r/<author>/<name>`)
is what `npx shadcn add` needs. The two author handles frequently differ (e.g. community
`daiv09` → registry `daiwiikharihar17147`; community `efferd` → registry `sshahaider`).

> Location note: the master plan said `/docs/duty-free-registry-urls.md`; placed under
> `spec/` instead to match this repo's single docs convention (CLAUDE.md).

| # | Component | Install URL (`shadcn add`) | Community source | Declared deps | Role on /duty-free |
|---|---|---|---|---|---|
| 1 | animated-text-cycle | `https://21st.dev/r/thimows/animated-text-cycle` | thimows/animated-text-cycle | framer-motion | Hero intro (cycling copy) |
| 2 | team (tailark) | `https://21st.dev/r/meschacirung/team` | tailark/team | motion | Crew grid in ObjectSwitcher |
| 3 | freelancer-profile-card | `https://21st.dev/r/lavikatiyar/freelancer-profile-card` | lavikatiyar/freelancer-profile-card | framer-motion, lucide-react | Crew profile inside center modal |
| 4 | focus-rail | `https://21st.dev/r/daiwiikharihar17147/focus-rail` | daiv09/focus-rail | framer-motion | Memories rail in ObjectSwitcher |
| 5 | image-gallery | `https://21st.dev/r/sshahaider/image-gallery` | efferd/image-gallery | framer-motion | Full gallery on /duty-free/memories/[slug] |
| 6 | leaderboard-card | `https://21st.dev/r/trophyso/leaderboard-card` | trophyso/leaderboard-card | (none declared) | Leaderboard block above Arcade |

## Resolution method
Handles 1, 2, 4 were known from the source notes / B0; handles 3, 5, 6 were resolved by
reading each component's "Install" snippet on its 21st.dev community page (2026-06-27).

## Dependency note (Tailwind v4 / motion)
5 of 6 declare **framer-motion / motion**. The repo already ships `motion@^12.40.0`
(framer-motion is its peer in the lockfile), so the carve-out in master-plan V3-4 (motion
permitted inside vendored components only) is already satisfied — `shadcn add` should treat
these as already-installed. `lucide-react@^1.18.0` is present. None of the 6 pulls Radix.

## Dropped components (NOT installed — visual inspiration only)
- `ravikatiyar162/reward-card` (Birthday card) — dropped per 🟠6; would force `react-confetti` + `react-use`.
- `larsen66/heroui-tabs` (separator tabs) — dropped per 🟠7; ObjectSwitcher tabs are hand-rolled.

## Install pipeline (validated in B0.5 with #2 team)
```
npx shadcn@latest add <install-url>   # resolved via repo-root components.json
# → lands in src/components/duty-free/ui/<name>.tsx
# → adapt tokens per master-plan §7, diff raw vs adapted in the dev lab harness
```

# Bundle Analysis — 2026-06-28 (D-097)

**Plan as drafted:** add `@next/bundle-analyzer`, run `ANALYZE=true pnpm build`, dynamic-import
heavy modules off First Load.

## Premise override #1 — the analyzer doesn't work with Turbopack

`@next/bundle-analyzer` is a thin wrapper around `webpack-bundle-analyzer` — it hooks the
**webpack** config. This project builds with **Turbopack** (`next build` → Turbopack in Next 16),
which produces no webpack stats, so `ANALYZE=true` is inert. The prescribed measurement method is
not available; I measured the real Turbopack output (`.next/static/chunks`) directly instead.

## Premise override #2 — the heavy deps are already off the demo path

The drafted candidate list (d3, leaflet, charting libs, xlsx/mammoth, etc.) — what's actually in
`package.json`: `d3`, `leaflet`, `topojson-client` (the APIX maps), `motion`, `react-markdown` +
`remark-gfm`, `lucide-react`.

| Dep | Where | On demo path? |
|---|---|---|
| `leaflet` | `apix-group.tsx` — **already** `import("leaflet")` (dynamic, SSR-safe) | No (APIX page) |
| `d3` + `topojson` | `apix-network.tsx` (static import) | No — used only via `page-view.tsx` on **brand/APIX** pages |
| `react-markdown` + `remark-gfm` | AI answer rendering | **Yes** — needed (AI chat hero) |
| `motion` | hero animations | **Yes** — needed |
| `lucide-react` | icons (per-icon imports) | shared, tree-shaken |

Verified: **no demo-path route** (`/`, `/documents-library/*`, `/presentation-hub/*`) imports
`d3`/`leaflet`/the APIX components. Real Turbopack chunks: largest 283KB, total
`.next/static/chunks` = 2.2M; the big map/charting deps are in route-specific chunks, not the
demo First Load.

## Decision — no code change

The two clear dynamic-import candidates (d3, leaflet) are **already** isolated to non-demo
brand/APIX pages (leaflet already lazy). The remaining demo-path weight is `react-markdown` +
`motion`, both demo-critical (the prompt itself says do **not** dynamic-import the demo hot path —
every KB on the AI-chat First Load is what Ümit sees first). Churning the codebase for theoretical
wins on non-demo pages isn't justified.

## Post-demo backlog (non-demo, optional)

- `d3` is statically imported in `apix-network.tsx`, pulled in via `page-view.tsx` — so it loads
  on **all** brand pages, even those without the network map. Dynamic-importing `apix-network`
  inside `page-view` would trim brand-page First Load. Non-demo, low priority.
- If a Turbopack-native bundle visualization is wanted later, `next build --webpack` + the analyzer
  gives an approximate (non-prod) picture, or use `next build` then inspect `.next/static/chunks`.

*Generated 2026-06-28. Premise-first recon overrode both the tool choice and the candidate list.*

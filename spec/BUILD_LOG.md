# terminalv2 — Build Log

Running record of what's been built, when. Newest entries on top.

---

## JetBrains Mono removed — Inter is the sole family (2026-06-18)

Removed JetBrains Mono (introduced in the previous run): dropped the
`next/font` import and `--font-jetbrains-mono` variable from `layout.tsx`, and
redefined `--font-mono` in `theme.css` to resolve to Inter (identical to
`--font`). The variable is kept so the existing `var(--font-mono)` usages
inherit Inter untouched — no monospace anywhere.

---

## Typography foundation — Inter + canonical type scale (2026-06-18)

Introduced Inter as the single sans family (self-hosted via `next/font`, with
JetBrains Mono for the mono token) and a canonical type scale as `:root` tokens
in `theme.css` (`--text-*`, `--leading-*`, `--weight-*`). Replaced every
hardcoded `font-size`/`line-height`/`font-weight` across `src/` with those
tokens. The four APIX Webflow ports (`apix-*.css`, `apix-network.tsx`) keep their
off-scale values verbatim per **D-046** (zero pixel drift) — exact-matching
values were tokenized, non-matching ones left as literals marked
`/* D-046 verbatim */`. Removed the dead `--font-geist-*` variables.

---

## Phase 3.5 — Design system + brand hierarchy (COMPLETE — 2026-06-15)

**Status:** All design decisions locked, DB restructured, docs consolidated.
**Tag:** `phase-3.5-design-consolidation`

### What was done

#### Design iteration (3 mockup rounds)

- **v1 (rejected):** Torch Red as UI accent — user feedback "too much red"
- **v2 (partly approved):** Switched to Quantum Blue, added collapsible sidebar
  with toggle, made orbs toggleable (on for landing, off for detail), softened
  card hover (no translate-Y bounce), tall color panels with hover-expand for
  brand color palettes
- **v3 (approved):** Final structure — Dashboard / Brands+Products (with IBE
  expandable) / Resources sections. Shadows +5%. Three document download styles
  side-by-side for review

Reference mockup committed to `spec/mockups/v3-01-dashboard.html`.

#### Webflow embed extraction (~224 KB)

Extracted custom HTML/CSS/JS from the original Webflow export for verbatim
preservation. Saved to `spec/embeds/`:

- `apix-page-embeds.html` (34 KB) — APIX Workflow + Global Network
- `apix-additional.css/.js` (88 KB) — APIX support code
- `ibe-tools-showcase.html` (15 KB) — full standalone IBE products showcase
- `jersey-customizer.html` + CSS/JS (17 KB) — Internal Branding tool
- `signature-generator.html` (0.6 KB) — email signature form
- `out-of-office-generator.html` (0.4 KB) — OOO message form
- `color-strip-pattern.html` (0.7 KB) — reference for color_palette block
- `service-page-support.css/.js` (66 KB) — shared support code

Maps to Phase 6 React components per `EMBEDS_INVENTORY.md`.

#### Database schema changes

Three new migrations applied via Supabase MCP:

- **0007_brand_hierarchy_and_sidebar.sql**
  - `brands.parent_id` (uuid, nullable, self-reference) — for IBE product hierarchy
  - `brands.is_product` (boolean) — distinguishes brand vs product-in-suite
  - `brands.sidebar_section` (text) — `brands` / `resources` / `hidden`
  - `pages.hidden_in_sidebar` (boolean) — for Playground, airLounge

- **0008_restructure_brands.sql**
  - Renamed `service-center` → `service-center-antalya` (brand + page slug + all sub-page paths)
  - Moved Presentation Hub to `sidebar_section = 'resources'`, made it `rendering_mode = 'hardcoded'` with `component_key = 'presentation-hub'`
  - Updated top-level brand `sort_order` to match final sidebar (10, 20, 30, 40, 50, 60, 70)
  - Added 7 NEW IBE product sub-brands with `parent_id = (IBE Product Suite id)`: multicheck, cockpit, myTransfer, myBooking, rentalCar, myStats, airLounge
  - Re-linked existing IBE sub-pages to their new product brand_id
  - Marked airLounge sub-page `hidden_in_sidebar = true`
  - Marked Playground `hidden_in_sidebar = true`
  - Deleted 4 standalone pages (`/budget26`, `/ops`, `/image-grid`, `/focus-mgzn`)

- **0009_design_system_settings.sql**
  - Seeded `settings` table with design tokens, sidebar config, orb config,
    document download style preference, Presentation Hub section structure
  - Added `documents.download_style` column (per-document override)
  - Added `documents.presentation_section` column (for Presentation Hub categorization)

#### Final DB state after Phase 3.5

- Brands: **15** (8 original + 7 new IBE products)
- Pages: **52** (was 56, -4 standalone pages)
- Settings: 19 keys seeded

#### Spec consolidation

New files:
- `spec/DESIGN_SYSTEM.md` — full design language documentation
- `spec/EMBEDS_INVENTORY.md` — what we preserved from Webflow

Overwritten with new content:
- `spec/ARCHITECTURE.md` — reflects new 15-brand structure, 52 pages, design system
- `spec/DECISIONS.md` — added D-034 to D-046, marked D-010/D-011/D-023 superseded
- `spec/PHASE_PLAN.md` — Phase 4 onwards revised to new structure
- `spec/SOURCE_INVENTORY.md` — embeds inventory added, standalone pages removed
- `spec/BUILD_LOG.md` — this entry
- `README.md` — file list updated, structure note

Unchanged:
- `spec/CONTRIBUTING.md` — workflow rules still apply
- `spec/PRE_FLIGHT.md` — historical pre-Phase-1 doc

#### Locked design decisions

D-034 through D-046 added — see `DECISIONS.md`.

Key principles now enforced:
1. iOS 18 Liquid Glass design system with light + dark themes
2. Quantum Blue (`#0A82DF`) is the ONLY UI accent color
3. Torch Red, Orient Blue, etc., appear ONLY in brand identity content
4. Three document download styles available, default = preview cards
5. Brand hierarchy is two levels (parent → product)
6. Custom Webflow embeds preserved verbatim, ported 1:1 in Phase 6

### Next: Phase 4 — Public frontend (using new structure)

---

## Phase 3 — Next.js scaffold + auth shell (COMPLETE — 2026-06-15)

**Stack confirmed live:** Next.js 16.2.9 (Turbopack) + Tailwind 4.3.1 + Supabase SSR

### Scaffold
- `pnpm create next-app@latest` with TypeScript, Tailwind, App Router, src-dir
- Next.js bumped to 16.2.9 (was specced as "15" — see D-031)
- pnpm 11.7.0 + Node 24.16.0
- sharp not built locally (image optimization falls back, fine for now)
- Scaffold merged into `D:\terminal V2\` preserving spec/, supabase/, .git/
- Build green: `pnpm build` → "Compiled successfully"

### Auth dependencies
- @supabase/supabase-js 2.108.1, @supabase/ssr 0.12.0
- zod 4.4.3, react-hook-form 7.79.0, @hookform/resolvers 5.4.0
- clsx, tailwind-merge, class-variance-authority, lucide-react, tailwindcss-animate

### Files added
- `src/lib/utils.ts` — cn() helper
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — async server client (cookies() awaited)
- `src/lib/supabase/middleware.ts` — refreshSession() helper (cookie refresh only)
- `src/proxy.ts` — Next.js 16 proxy (replaces middleware.ts; see D-032)
- `src/app/login/page.tsx` — public login route
- `src/app/login/login-form.tsx` — Client Component with useTransition
- `src/app/login/actions.ts` — loginAction + logoutAction Server Actions
- `src/app/admin/layout.tsx` — auth gate via redirect() (see D-033)
- `src/app/admin/page.tsx` — dashboard placeholder with live stats

### Verification
- Localhost: /admin → redirect /login → sign in dev@airtuerk.de → /admin OK
- Stats query returns Brands 8, Pages 56, Assets 759, Documents 47
  (Pre-Phase-3.5 numbers; Phase 3.5 changes brands to 15, pages to 52)
- Sign out → /login OK
- Production (terminalv2-dusky.vercel.app): identical behaviour verified

### Commits
- 317338e feat(auth): add login + admin shell with supabase auth

### Phase 3 follow-ups (deferred — addressed in Phase 4)
- Database types generation: add `db:types` script to package.json
- Fonts: upload Inter + GeneralSans to public/fonts/, configure next/font/local

---

## Phase 2 — Asset Upload (COMPLETE — 2026-06-15)

**Status:** All 759 files uploaded to Supabase Storage. Database tables populated.

### What was done

- Uploaded 708 images to images bucket (152 MB)
- Uploaded 47 documents to documents bucket (92 MB)
- Uploaded 4 videos to videos bucket (11 MB)
- 759 rows inserted into assets table
- 47 rows inserted into documents table with category, language, brand_id, version
- Documents auto-categorized into 12 categories
- 4 brands have linked documents: airtuerk-service (7), airtuerk-holidays (2), atbeds (1), airtuerk-apix (1)
- All public URLs verified working (HTTP 200, correct content-types)

### Deviations from spec

- 12 fonts not yet uploaded. Decision: defer to Phase 3 because Next.js scaffold uses next/font/local with files in /public/fonts/. The fonts bucket exists for future use but is empty for v1.
- Asset count is 759 not 708 — uploaded set slightly higher than original manifest. Dedup in Phase 5 admin tooling.

---

## Phase 1 — Infrastructure (COMPLETE — 2026-06-15)

**Status:** All infrastructure provisioned and verified.

### What was done

- Supabase project terminalv2 (ref: zkydrymygjrscjbhusxp)
- Region: eu-central-1 (Frankfurt), Pro tier, Postgres 17.6.1
- All 6 migrations applied via Supabase MCP
- 9 tables, RLS enabled on all
- 4 Storage buckets (images, documents, videos, fonts)
- 8 brands seeded, 56 pages seeded (later changed in Phase 3.5)
- Admin trigger active for dev@airtuerk.de
- First admin user created via Studio (role=admin via trigger)

- Vercel project terminalv2
- Team: airtuerk-service-gmbhs-projects
- Linked to GitHub airtuerkmarketing/terminalv2 (main branch)
- Env vars set, auto-deploy enabled
- Preview URL: terminalv2-dusky.vercel.app

- GitHub repo airtuerkmarketing/terminalv2 (private)

### Decision updates

- D-013: Pro tier active from start (org-level)
- D-027: Initial admin email hardcoded in handle_new_user() function due to Supabase Postgres permission model

---

## Phase 0 — Planning (COMPLETE)

Specification documents written and audited (2 review rounds).

---

## Phase 3+ roadmap (post Phase 3.5)

- **Phase 4 — Public frontend** (sidebar with new hierarchy, blocks, layouts, Liquid Glass theme)
- **Phase 5 — Admin CMS** (page editor, asset/doc/team managers, brand settings)
- **Phase 6 — Hardcoded interactives** (team, APIX workflow + global network, signature, OOO, identity configurator, IBE tools showcase, Presentation Hub sections)
- **Phase 7 — Polish + cutover** (full-text search, performance, a11y, SEO, DNS to Vercel)
- **Phase 8 — RAG search** (separate scope, later)

---

## Logging rules

- Entries terse: what changed, when, why if non-obvious
- Decisions go in DECISIONS.md, not here
- File forward only — never rewrite history
- Phase transitions get a header bump

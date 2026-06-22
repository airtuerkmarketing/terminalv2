# terminalv2 — Phase-by-Phase Execution Plan

What gets built, in what order, with exit criteria.

**Current status (2026-06-22):** Phases 0–4 COMPLETE and deployed. Much of Phase 6
(APIX ports, signature + out-of-office generators, Presentation Hub) and the Phase 7
search + DNS cutover also shipped — out of the original order. Post-Phase-4 work since:
File System v2 (roles + folder Document Library), the User Panel (admin/users list +
detail, role picker, seeded key users), and the Presentation Hub rebuild. Highest
migration: `20260622193003`; highest decision: **D-056**. The main remaining block is
Phase 5 (full Admin CMS).

---

## Phase 0 — Planning ✅ COMPLETE

All specification documents written, all decisions locked.

---

## Phase 1 — Infrastructure provisioning ✅ COMPLETE

All Supabase, Vercel, GitHub projects created and configured.

---

## Phase 2 — Asset upload ✅ COMPLETE

759 files in Supabase Storage. assets + documents tables populated.

---

## Phase 3 — Next.js scaffold ✅ COMPLETE

Login + /admin shell live on `terminalv2-dusky.vercel.app`.

---

## Phase 3.5 — Design system + brand hierarchy ✅ COMPLETE

Three mockup iterations, embed extraction (~224 KB), DB restructure (3 new
migrations), docs consolidated. See `BUILD_LOG.md` Phase 3.5 entry.

**Outcome:**
- 15 brands (was 8) — 7 top-level + 7 IBE products + 1 resources (Presentation Hub)
- 52 pages at the time (was 56) — 4 standalone deleted; live count is now 55 (ARCHITECTURE §4)
- iOS 18 Liquid Glass design system locked
- Quantum Blue as UI accent
- Sidebar: Dashboard / Brands+Products / Resources, IBE expandable

---

## Phase 4 — Public frontend ✅ COMPLETE

**Goal:** Site visually 1:1 with the target design (per mockup v3) using the new structure.

**Status:** Shipped and deployed — theme tokens are in `src/styles/theme.css`, the
app shell, block renderer, catch-all route, landing page, and hardcoded routes are
all live. (Checklist below kept for reference.)

### Pre-Phase-4 prep

- Verify migrations 0007/0008/0009 applied in production Supabase
- Verify brand count = 15, page count = 52 (now 55 live)
- Pull `spec/embeds/` files for reference (will be ported in Phase 6, but
  Phase 4 needs the color_palette pattern from `color-strip-pattern.html`)

### Steps

1. **Theme tokens** — port the inline `<style>` block from
   `spec/mockups/v3-01-dashboard.html` to `src/styles/theme.css`. Configure
   Tailwind 4 to bridge CSS vars.

2. **App shell**
   - `src/components/shell/sidebar.tsx` — collapsible 252px↔64px
     - Reads from `brands` (filtered by `sidebar_section`) + `pages.hidden_in_sidebar`
     - IBE Product Suite expandable section (chevron toggle)
     - User block at bottom
   - `src/components/shell/topbar.tsx` — search, notifications, site link
   - `src/components/shell/ambient.tsx` — orb backgrounds with toggle
   - `src/components/shell/theme-toggle.tsx` — light/dark
   - `src/app/(public)/layout.tsx` — wraps all public pages with shell

3. **Block renderer** — `src/lib/blocks/registry.ts` + `src/components/blocks/`
   - 15 block types from D-005
   - Schemas in `src/lib/blocks/schemas.ts` (Zod)
   - `<BlockRenderer block={block} />` — master switch on `block.type`
   - Two-column layout wrapper (`layout='two-column'` block flag)

4. **Catch-all route** — `src/app/(public)/[...slug]/page.tsx`
   - Resolves DB page, decides blocks vs hardcoded
   - 404 handling

5. **Landing page** — `src/app/(public)/page.tsx`
   - Queries `full_path = '/'`
   - Renders blocks (content TBD per user — dashboard not brand-cards)

6. **Hardcoded route files** (Phase 4 scope: shells + data only, full UI in Phase 6)
   - `src/app/(public)/team/page.tsx`
   - `src/app/(public)/asset-library/page.tsx`
   - `src/app/(public)/documents-library/page.tsx`
   - `src/app/(public)/presentation-hub/page.tsx` (NEW — sectioned list)
   - `src/app/(public)/search/page.tsx` (Phase 7 search; placeholder UI here)

7. **Mobile responsive** — sidebar collapses to drawer under 768px

### Exit criteria

- [ ] Every URL from the 55-page tree returns a working page
- [ ] Sidebar renders correctly with active state
- [ ] IBE expandable works (chevron toggles 6 sub-products)
- [ ] Orbs toggleable, theme toggleable, sidebar collapsible
- [ ] Visual diff acceptable vs `spec/mockups/v3-01-dashboard.html`
- [ ] Asset URLs resolve from Supabase Storage
- [ ] Mobile responsive verified at 375px, 768px, 1280px
- [ ] `pnpm typecheck` and `pnpm lint` pass

---

## Phase 5 — Admin CMS

**Goal:** Buhara can manage all content via `/admin`.

### Steps

1. **Admin shell polish** — sidebar, topbar, theme, Cmd-K palette
2. **Page management** — list, edit metadata, block editor with three doc-download style picker, live preview, publish
3. **Asset management** — grid view, upload, edit, replace, delete
4. **Document management** — table view, filter, edit. Includes `download_style` and `presentation_section` fields per doc
5. **Team management** — table view, filter by department/brand, edit
6. **Brand management** — edit name, logo, color, tagline, sidebar_section, parent_id
7. **Settings** — design tokens (read-only display + override), Presentation Hub sections (editable), sidebar config

### Exit criteria

- [ ] Buhara can edit every content type end-to-end through `/admin`
- [ ] Publishing reflects on public site within seconds via `revalidatePath`
- [ ] Cmd-K palette navigates to any page/asset/document
- [ ] Brand hierarchy editable (assign parent_id, toggle sidebar_section)

---

## Phase 6 — Hardcoded interactives + embed port — ⚠️ MOSTLY SHIPPED

**Goal:** Restore the special components from the Webflow embeds.

### Steps

1. ✅ **Team directory** (`/team`) — search, filter by department/brand
2. ⏳ **IBE Tools Showcase** (`/ibe-product-suite`) — port from `ibe-tools-showcase.html` (still pending)
3. ✅ **Presentation Hub** (`/presentation-hub`) — rebuilt (migration 0033, folder model)
4. ✅ **APIX Workflow** (`/airtuerk-apix/workflow`) — ported (`apix-workflow.tsx`)
5. ✅ **APIX Network map** (`/airtuerk-apix/global-network` → `apix-network`) — ported (`apix-network.tsx`, 0014)
   - Plus **APIX Presentation player** (0015) and **APIX Group structure** (0016) — all four APIX tools ported.
6. ✅ **Email Signature Generator** — shipped (`email-signature.tsx`, 4 brand routes)
7. ✅ **Out-of-Office Generator** — shipped (`out-of-office.tsx`)
8. ❌ **Jersey Customizer** — dropped; the `/internal-branding/configurator` route was removed (D-056, never built)

### Exit criteria

- [ ] Each interactive matches or exceeds the Webflow original's behavior
- [ ] Underlying data editable via admin (signature templates, IBE products)
- [ ] No visual regression vs original (side-by-side QA)

---

## Phase 7 — Polish + cutover — ⚠️ PARTIALLY SHIPPED

**Goal:** Production launch. DNS cutover is **done** — prod serves
[www.airtuerk.dev](https://www.airtuerk.dev) (the old `terminal.airtuerk.de`/Webflow is retired).

### Steps

1. **Search** — shipped differently than planned: there is a live `/api/search` route
   (admin/service-role backed). The originally planned `0010_fulltext_search.sql`
   migration name is obsolete (`0010` is `fix_brand_card_colors`); no generated
   `search_vector` columns were added.
2. ✅ **`/api/search` route handler** — live (Dashboard search box)
3. Performance audit (Lighthouse, Core Web Vitals)
4. Accessibility audit (Lighthouse a11y, keyboard nav, screen reader)
5. SEO — sitemap.xml, robots.txt, OG tags per page
6. Security review — CSP headers, rate limiting, RLS audit
7. Vercel rewrite rules for legacy URLs (`/service-center` → `/service-center-antalya`, removed standalone pages)
8. DNS cutover from Webflow → Vercel
9. Monitor 24 hours
10. Tear down Webflow site

### Exit criteria

- [ ] `0010_fulltext_search.sql` applied, `/api/search` returns results
- [ ] DNS resolves to Vercel
- [ ] All pages load, all assets work
- [ ] Lighthouse: 90+ across performance, a11y, best-practices, SEO
- [ ] No console errors in production
- [ ] Legacy URL rewrites verified

---

## Phase 8 — Search → RAG (deferred, separate project)

Not estimated here. Triggered after Phase 7 is stable.

Steps include: enable pgvector, embedding pipeline (Edge Function or Vercel
Function), chat UI at `/search`, RAG retrieval + Claude API integration,
citations.

---

## Estimating effort (rough, remaining)

Re-baselined 2026-06-22 — most of this is now done out of order:

| Phase | Status |
|---|---|
| ~~0–3.5~~ | done |
| ~~4 — Public frontend~~ | done (shipped + deployed) |
| 5 — Admin CMS | partially done; main remaining block |
| ~~6 — Interactives~~ | mostly done (only IBE Tools Showcase pending) |
| ~~7 — Polish + cutover~~ | cutover done; search shipped; audits ongoing |
| 8 — RAG | groundwork shipped (gold-set + AI test sets, 0025–0029); embedding eval next |

Plus shipped beyond the original plan: File System v2 (roles + folder Document
Library), the User Panel, and the Presentation Hub rebuild.

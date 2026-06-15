# terminalv2 — Architecture

This document is the **canonical system design** for terminalv2. Every
decision below is locked. Changes require a new entry in `DECISIONS.md` and
an update here.

**Last consolidated:** Phase 3.5 (2026-06-15)

---

## 1. System overview

terminalv2 is a single Next.js application with two faces:

- **Public frontend** — the brand portal at `terminal.airtuerk.de`
- **Admin CMS** — protected `/admin` routes for content management

Both run in the same Next.js project, share the same Supabase backend, and
deploy together to Vercel as one unit.

```
                ┌──────────────────────────────────────────────────────┐
                │  terminal.airtuerk.de   (Vercel Edge — eu-central-1) │
                │  ┌────────────────────────┬────────────────────────┐ │
                │  │  Public (no auth)      │  /admin (auth-gated)   │ │
                │  │  • Dashboard           │  • Dashboard           │ │
                │  │  • 7 brand sections    │  • Page editor         │ │
                │  │  • 7 IBE products      │  • Asset library       │ │
                │  │  • Presentation Hub    │  • Document library    │ │
                │  │  • Asset/Doc/Team libs │  • Team manager        │ │
                │  │  • /search             │  • Brand settings      │ │
                │  └────────────────────────┴────────────────────────┘ │
                └────────────────────────────┬─────────────────────────┘
                                             │
                                             ▼
                ┌──────────────────────────────────────────────────────┐
                │  Supabase project: terminalv2   (Frankfurt)          │
                │  ┌──────────────────┬──────────────────────────────┐ │
                │  │  Postgres        │  Storage (4 buckets)         │ │
                │  │  • brands (15)   │  • images   (CDN-cached)     │ │
                │  │  • pages (52)    │  • documents (CDN)           │ │
                │  │  • blocks        │  • videos   (streaming)      │ │
                │  │  • assets        │  • fonts    (immutable)      │ │
                │  │  • documents     │                              │ │
                │  │  • team_members  │  Auth (admin users)          │ │
                │  │  • tm_brands*    │                              │ │
                │  │  • settings      │  *junction: team_members ↔   │ │
                │  │  • profiles      │   brands (many-to-many)      │ │
                │  └──────────────────┴──────────────────────────────┘ │
                └──────────────────────────────────────────────────────┘
```

**Brand count is 15:** 7 top-level brands + 7 IBE product sub-brands + 1 Presentation Hub (resources section). See §2 for breakdown.

**Page count is 52:** 13 top-level + 39 sub-pages, after removing 4 standalone pages in Phase 3.5.

---

## 2. Brand hierarchy

terminalv2 has a **two-level brand hierarchy**, introduced in Phase 3.5 (D-039).

### Top-level brands (7) — appear in main sidebar "Brands & Products"

| sort | slug | name | sidebar_section | parent_id |
|---|---|---|---|---|
| 10 | `airtuerk-service` | airtuerk Service | brands | NULL |
| 20 | `airtuerk-holidays` | airtuerk Holidays | brands | NULL |
| 30 | `atbeds` | atBeds | brands | NULL |
| 40 | `service-center-antalya` | Service Center Antalya | brands | NULL |
| 50 | `ibe-product-suite` | IBE Product Suite (expandable) | brands | NULL |
| 60 | `internal-branding` | Internal Branding | brands | NULL |
| 70 | `airtuerk-apix` | airtuerk APIX | brands | NULL |

### IBE Product Suite sub-brands (7) — nested under IBE in sidebar

| sort | slug | name | parent_id | is_product | sidebar |
|---|---|---|---|---|---|
| 51 | `multicheck` | multicheck | IBE | true | nested |
| 52 | `cockpit` | cockpit | IBE | true | nested |
| 53 | `mytransfer` | myTransfer | IBE | true | nested |
| 54 | `mybooking` | myBooking | IBE | true | nested |
| 55 | `rentalcar` | rentalCar | IBE | true | nested |
| 56 | `mystats` | myStats | IBE | true | nested |
| 57 | `airlounge` | airLounge | IBE | true | **hidden** |

### Resources section brands (1)

| sort | slug | name | sidebar_section | rendering |
|---|---|---|---|---|
| 200 | `presentation-hub` | Presentation Hub | resources | hardcoded |

---

## 3. Sidebar structure

```
Dashboard
─── divider ───
airtuerk Service
airtuerk Holidays
atBeds
Service Center Antalya
IBE Product Suite                ▶  (expandable, click chevron)
   ├── multicheck
   ├── cockpit
   ├── myTransfer
   ├── myBooking
   ├── rentalCar
   └── myStats
   (airLounge: hidden_in_sidebar)
Internal Branding
airtuerk APIX
─── divider ───
Asset Library
Document Library
Team
Presentation Hub
```

Sidebar source of truth: `brands.sidebar_section` + `brands.parent_id` +
`pages.hidden_in_sidebar`. The renderer queries these and builds the tree.

Hidden in sidebar but URL is still reachable:
- `/playground` (game coming later)
- `/ibe-product-suite/airlounge` (legacy product, kept for inbound links)

Deleted entirely in Phase 3.5:
- `/budget26`, `/ops`, `/image-grid`, `/focus-mgzn`

---

## 4. Site structure (52 pages — canonical)

### Group A — Brand sections (collapsible parents, 7 brands)

| # | Path | Title | Children |
|---|---|---|---|
| 02 | `/airtuerk-service` | airtuerk Service | 6 |
| 03 | `/airtuerk-holidays` | airtuerk Holidays | 5 |
| 04 | `/atbeds` | atBeds | 6 |
| 05 | `/service-center-antalya` | Service Center Antalya | 5 |
| 06 | `/ibe-product-suite` | IBE Product Suite (hardcoded) | 7 |
| 07 | `/internal-branding` | Internal Branding | 2 |
| 08 | `/airtuerk-apix` | airtuerk APIX | 8 |

### Group B — Landing & utilities

| # | Path | Title | Type |
|---|---|---|---|
| 01 | `/` | Dashboard | Block-driven (landing) |
| 09 | `/presentation-hub` | Presentation Hub | Hardcoded (sectioned doc list) |
| 10 | `/asset-library` | Asset Library | Hardcoded UI |
| 11 | `/documents-library` | Documents Library | Hardcoded UI |
| 12 | `/team` | Team | Hardcoded UI |
| 13 | `/playground` | Playground | Hidden until game ships |

### Full sub-page tree

#### airtuerk Service (6) — the Schablone
- `/airtuerk-service/logos`
- `/airtuerk-service/colors`
- `/airtuerk-service/ux`
- `/airtuerk-service/master-deck`
- `/airtuerk-service/email-signature` (hardcoded)
- `/airtuerk-service/letterhead`

#### airtuerk Holidays (5)
Same as Service minus the UX page.

#### atBeds (6) — same Schablone as airtuerk Service

#### Service Center Antalya (5) — note URL renamed from /service-center

#### IBE Product Suite (7 nested products, 6 visible)
- `/ibe-product-suite/multicheck`
- `/ibe-product-suite/cockpit`
- `/ibe-product-suite/mytransfer`
- `/ibe-product-suite/mybooking`
- `/ibe-product-suite/rentalcar`
- `/ibe-product-suite/mystats`
- `/ibe-product-suite/airlounge` (hidden in sidebar)

#### Internal Branding (2)
- `/internal-branding/applied-identity`
- `/internal-branding/configurator` (hardcoded — Jersey Customizer)

#### airtuerk APIX (8)
- `/airtuerk-apix/presentation`
- `/airtuerk-apix/workflow` (hardcoded — interactive node graph)
- `/airtuerk-apix/global-network` (hardcoded — animated map)
- `/airtuerk-apix/partner`
- `/airtuerk-apix/agreement`
- `/airtuerk-apix/documentation`
- `/airtuerk-apix/nda`
- `/airtuerk-apix/master-deck`

---

## 5. Page rendering modes

| `rendering_mode` | Behavior |
|---|---|
| `blocks` | Renders by reading ordered rows from `blocks` table |
| `hardcoded` | Renders by mounting a fixed React component (looked up by `pages.component_key`) |

### Hardcoded pages

| Path | `component_key` | Why hardcoded |
|---|---|---|
| `/team` | `team-directory` | Queries `team_members`, filter UI |
| `/asset-library` | `asset-library` | Queries `assets`, filter UI |
| `/documents-library` | `document-library` | Queries `documents`, filter UI |
| `/presentation-hub` | `presentation-hub` | Sectioned doc list (NEW in 3.5) |
| `/search` | `search` | RAG chat interface |
| `/ibe-product-suite` | `ibe-tools-showcase` | Adapted from Webflow embed (NEW in 3.5) |
| `/airtuerk-apix/workflow` | `apix-workflow` | Interactive node graph |
| `/airtuerk-apix/global-network` | `apix-global-network` | Animated map (NEW in 3.5) |
| `/airtuerk-service/email-signature` | `email-signature` | Form-driven HTML generator |
| `/airtuerk-holidays/email-signature` | `email-signature` | Same component, branded |
| `/atbeds/email-signature` | `email-signature` | Same component, branded |
| `/service-center-antalya/email-signature` | `email-signature` | Same component, branded |
| `/internal-branding/configurator` | `identity-configurator` | Jersey Customizer (D-025) |

Hardcoded pages still have a `pages` row.

---

## 6. Block system

There are **15 block types** plus `raw_html` as an escape hatch.

`color_entry` is a sub-shape inside `color_palette.colors[]`, not a separate block.

### Structure blocks
- `page_hero` — `{ number?: string, title: string, subtitle?: string }`
- `description` — `{ html: string }`
- `page_nav` — `{ prev?: { label, href }, next?: { label, href } }`

### Brand blocks
- `color_palette` — `{ colors: ColorEntry[], display: 'panels' | 'strips' }`
  - `display: 'panels'` (default) = tall hover-expand panels per DESIGN_SYSTEM §9
  - `display: 'strips'` = compact horizontal strip
- `typography_specimen`
- `type_scale_table`
- `logo_showcase` — Webflow-style large display + Download link
- `logo_grid` — circles or tiles layout

### Content blocks
- `asset_block`
- `asset_grid`
- `document_list` — `{ style?: 'list_rows' | 'preview_cards' | 'image_outline_button', groups: ... }`
  - Three styles per Phase 3.5. Default if not set: `preview_cards`.
- `duty_card`, `duty_grid`
- `product_showcase`

### Escape hatch
- `raw_html`

### Layout flag (every block)

Stored as a column on `blocks`:
```
layout: 'full' | 'two-column'
```

Two-column places heading on left (~30%), content on right (~70%) — the
brand-detail Schablone pattern.

### Block validation

Every block type has a Zod schema in `src/lib/blocks/schemas.ts`. Schemas are paired with:
- TypeScript type (`src/lib/blocks/types.ts`)
- Renderer (`src/components/blocks/{group}/{name}.tsx`)
- Admin form (`src/components/admin/page-editor/block-form.tsx`)
- Registry entry (`src/lib/blocks/registry.ts`)

A "new block type" PR touches these five files plus a migration if needed.

---

## 7. Database schema

### Tables (10 total — 1 added in Phase 3.5 logic, no new tables)

Schema lives in:
- `supabase/migrations/0001_initial_schema.sql` — initial 9 tables + 1 junction
- `supabase/migrations/0007_brand_hierarchy_and_sidebar.sql` — adds columns: `brands.parent_id`, `brands.is_product`, `brands.sidebar_section`, `pages.hidden_in_sidebar`
- `supabase/migrations/0008_restructure_brands.sql` — data migration
- `supabase/migrations/0009_design_system_settings.sql` — settings seed + `documents.download_style` + `documents.presentation_section`

### `brands` (Phase 3.5 schema)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | |
| name, short_name, tagline, description | text | |
| logo_asset_id | uuid FK | |
| primary_color | text | hex |
| sort_order | integer | |
| `parent_id` | uuid FK | NEW — for sub-brand hierarchy |
| `is_product` | boolean | NEW — true for IBE products |
| `sidebar_section` | text | NEW — `brands` / `resources` / `hidden` |
| created_at, updated_at | timestamptz | |

### `pages` (Phase 3.5 schema)

Adds `hidden_in_sidebar boolean DEFAULT false`. All other columns from 0001 unchanged.

### `documents` (Phase 3.5 schema)

Adds:
- `download_style text` — overrides site default per document
- `presentation_section text` — for Presentation Hub categorization

### Row Level Security

Unchanged from 0002. Public read where applicable, admin write everywhere.

---

## 8. Storage buckets

Unchanged from 0003. Four buckets: `images`, `documents`, `videos`, `fonts`.

---

## 9. Routing model

### Static and hardcoded routes

```
src/app/(public)/page.tsx                       → /
src/app/(public)/team/page.tsx                  → /team
src/app/(public)/asset-library/page.tsx         → /asset-library
src/app/(public)/documents-library/page.tsx     → /documents-library
src/app/(public)/presentation-hub/page.tsx      → /presentation-hub  (NEW)
src/app/(public)/search/page.tsx                → /search
```

### Dynamic catch-all (everything else)

```
src/app/(public)/[...slug]/page.tsx
```

Handles all DB-driven pages.

**Resolution algorithm:**
1. Static file paths above match first (Next.js routing order)
2. `[...slug]/page.tsx` builds `full_path` from `params.slug`
3. Query: `SELECT * FROM pages WHERE full_path = $1 AND status = 'published'`
4. If `rendering_mode = 'blocks'` → load blocks, render via `BlockRenderer`
5. If `rendering_mode = 'hardcoded'` → mount component by `component_key`
6. If not found → Next.js `not-found.tsx`

### Next.js 16 async API

In Next.js 16, `params`, `searchParams`, `cookies()`, and `headers()` are async. See D-031.

---

## 10. Authentication & access

- Public site: no auth needed
- Admin (`/admin/*`): Supabase Auth, email+password
- Auth-gating happens in Server Component layouts (D-033), not in proxy.ts
- `proxy.ts` only refreshes session cookies (D-032)
- Roles: `admin` | `editor` | `viewer` — v1 uses only `admin`
- First admin: via Supabase Studio + D-027 trigger

---

## 11. Search

### Phase A — Postgres full-text search (Phase 7)

Migration `0010_fulltext_search.sql` (was 0007 in old plan, renumbered after 3.5):
- Generated `search_vector` columns on `pages`, `documents`, `team_members`
- `block_searchable_text` view
- GIN indexes
- `/api/search` route handler

### Phase B — RAG (Phase 8, deferred)

- pgvector extension
- Embeddings of pages, blocks, documents
- Chat-style UI at `/search`
- Claude API integration
- Stubs reserved from day one in `src/lib/search/rag.ts`

---

## 12. Design system

The visual language is documented in `DESIGN_SYSTEM.md`. Quick reference:

- **iOS 18 Liquid Glass** material system (light + dark themes)
- **Quantum Blue** (`#0A82DF`) as the only UI accent color
- **Brand colors stay in brand content** — never in UI chrome
- **Three document download styles**, default = preview cards
- **Sidebar collapses** 252px ↔ 64px, IBE expandable
- **Orbs** toggleable, on for Dashboard / off for detail pages
- **Shadows** soft but visible (+5% over initial proposal)
- **No card-bounce on hover** — calm background + shadow swap only

The reference implementation is `spec/mockups/v3-01-dashboard.html`. Phase 4 ports the tokens to `src/styles/theme.css`.

---

## 13. Custom embeds preserved from Webflow

See `EMBEDS_INVENTORY.md`. ~224 KB of custom HTML/CSS/JS extracted from the
original site:

- APIX Workflow + Global Network (largest)
- IBE Tools Showcase → becomes the `/ibe-product-suite` page body
- Jersey Customizer → `/internal-branding/configurator`
- Signature Generator → 4 brand sub-routes
- Out-of-Office Generator → `/airtuerk-service/out-of-office`
- Color Strip Pattern → reference for `color_palette` block

These get ported to React in Phase 6.

---

## 14. Caching & revalidation

- Public page rendering: `revalidate = 3600` (1 hour)
- Admin publish action: `revalidatePath(page.full_path)` + parent paths
- Asset URLs: immutable
- Sidebar tree: per-request React memoization

---

## 15. Anti-features (explicitly NOT in v1)

- Frontend user accounts (DB supports, feature off)
- Multi-language CMS content (`pages.language` reserved)
- Version history (Supabase PITR is DR for v1)
- Multi-reviewer publishing
- Webflow DevLink
- Third-party CMS (Payload, etc.)
- Real-time collaborative editing
- Public API
- Multi-tenant / white-label

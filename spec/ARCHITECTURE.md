# terminalv2 — Architecture

This document is the **canonical system design** for terminalv2. Every
decision below is locked. Changes require a new entry in `DECISIONS.md` and
an update here.

**Last consolidated:** 2026-06-22 (User Panel + Presentation Hub; reconciled against migrations through `20260622193003`)

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
                │  │  Postgres        │  Storage — 9 buckets:        │ │
                │  │  (22 tables      │  public: images, documents,  │ │
                │  │   + profiles_v)  │    videos, fonts, avatars    │ │
                │  │  • brands (15)   │  private: library,           │ │
                │  │  • pages (55)    │    presentations,            │ │
                │  │  • blocks        │    rag-knowledge,            │ │
                │  │  • documents +   │    confluence-attachments    │ │
                │  │    document_*    │                              │ │
                │  │  • team_members  │  Auth (super_admin /         │ │
                │  │  • profiles +    │    admin / user)             │ │
                │  │    profiles_v    │                              │ │
                │  └──────────────────┴──────────────────────────────┘ │
                └──────────────────────────────────────────────────────┘
```

**Brand count is 15:** 7 top-level brands + 7 IBE product sub-brands + 1 Presentation Hub (resources section). See §2 for breakdown.

**Page count is 55** (as of 2026-06-22, live DB): 12 top-level + 43 sub-pages, 2 hidden in sidebar. Was 52 at Phase 3.5; grew with the APIX group page (0016) and Presentation Hub (0033), while `/internal-branding/configurator` was removed (D-056).

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

## 4. Site structure (55 pages — as of 2026-06-22)

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

#### Internal Branding (1)
- `/internal-branding/applied-identity`
  (`/internal-branding/configurator` was removed — D-056)

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
| `/documents-library/*` | _(own route, not `component_key`)_ | File System v2 folder browser — `documents-library/[[...folder]]/page.tsx` (§9); legacy `document-library` component deleted (`c397b29`) |
| `/presentation-hub` | `presentation-hub` | Sectioned doc list (NEW in 3.5) |
| `/search` | `search` | RAG chat interface |
| `/ibe-product-suite` | `ibe-tools-showcase` | Adapted from Webflow embed (NEW in 3.5) |
| `/airtuerk-apix/workflow` | `apix-workflow` | Interactive node graph |
| `/airtuerk-apix/global-network` | `apix-global-network` | Animated map (NEW in 3.5) |
| `/airtuerk-service/email-signature` | `email-signature` | Form-driven HTML generator |
| `/airtuerk-holidays/email-signature` | `email-signature` | Same component, branded |
| `/atbeds/email-signature` | `email-signature` | Same component, branded |
| `/service-center-antalya/email-signature` | `email-signature` | Same component, branded |

Hardcoded pages still have a `pages` row. (`/internal-branding/configurator` /
`identity-configurator` was removed — D-056; it had no backing component.)

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

### Tables (22 base tables + 1 view, as of 2026-06-22)

The schema has grown well past the original 10. Current `public` tables, by area:

- **Core CMS:** `brands`, `pages`, `blocks`, `assets`, `documents`, `settings`,
  `team_members`, `team_member_brands` (junction).
- **Auth & users:** `profiles`, `user_role_defaults` (0030), `user_activity_log`
  (audit trail), plus the `profiles_v` **view**. `profiles` gained `team_member_id`
  (FK → `team_members`, `ON DELETE SET NULL`, unique partial index) and `updated_at`.
- **Document Library v2 (0031):** `document_folders`, `document_files`.
- **Presentation Hub (0033):** `presentation_folders`, `presentation_files`,
  `presentation_tags`, `presentation_file_tags`, `presentation_views`.
- **Intelligence layer (0025–0029):** `confluence_raw`, `confluence_attachments`,
  `confluence_comments`, `gold_set_answers`.

Schema entry points:
- `0001_initial_schema.sql` — initial 9 tables + 1 junction
- `0007`/`0008` — brand hierarchy columns + restructure data migration
- `0009` — design-system settings + `documents.download_style`/`presentation_section`
- `0030` — role model (`user_role_defaults`, role CHECK swap, helper functions)
- `0031` — Document Library v2 tables + private `library` bucket
- `0033` — Presentation Hub tables
- timestamped `20260621*`/`20260622*` — User Panel (profiles↔team_members link,
  `user_activity_log`, `profiles_v`, avatars bucket, RLS recursion / search_path fixes).
  Highest applied migration: `20260622193003_profiles_update_own_use_helper.sql`.

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

Note: superseded for the Document Library by the v2 tables below (D-053). The
`documents`/`assets` rows are left intact (orphaned, rollback) but no longer read.

### Document Library v2 tables (File System v2 — migration 0031)

- **`document_folders`** — recursive folder tree (`parent_id`), trigger-maintained
  materialized slug `path`, per-folder `is_public`, slug-format CHECK.
- **`document_files`** — one file per folder (`folder_id`), `language` (de/en/tr
  CHECK) + anchorless `group_id` variant cluster, `storage_path` into the private
  `library` bucket (no `public_url`), pg_trgm index on `title`.
- **`user_role_defaults`** (migration 0030) — email→role seed for the signup trigger.

The legacy `documents`/`assets` Document Library path is superseded (D-053) and its
React component was deleted in the dead-code cleanup (commit `c397b29`); rows remain
for rollback but are no longer read.

### Row Level Security

See §10 for the full auth model. In short: `is_admin()` = admin OR super_admin,
`is_super_admin()` gates structural ops, and `get_profile_role(uuid)` reads a role
without tripping the profiles SELECT policies (added 20260622 to break an RLS
recursion). Public read where applicable, admin write everywhere. The v2 library
tables and `user_activity_log` ENABLE **and FORCE** RLS (library keyed on per-folder
`is_public`, D-051); `profiles` role changes are super-admin-only (D-055).

---

## 8. Storage buckets

**9 buckets** (as of 2026-06-22):

- **Public** (4 from 0003 + `avatars`): `images`, `documents`, `videos`, `fonts`,
  `avatars` (added for the User Panel).
- **Private** (signed-URL / service-role only): `library` (Document Library v2 files,
  served via `/api/library/file/[id]`, D-052), `presentations` (Presentation Hub,
  served via `/api/presentations/file/[id]`), `rag-knowledge` and
  `confluence-attachments` (intelligence layer).

---

## 9. Routing model

### Static and hardcoded routes

```
src/app/(public)/page.tsx                       → /
src/app/(public)/team/page.tsx                  → /team
src/app/(public)/asset-library/page.tsx         → /asset-library
src/app/(public)/documents-library/[[...folder]]/page.tsx → /documents-library/*  (File System v2; optional catch-all, shadows [...slug] per D-008)
src/app/(public)/presentation-hub/page.tsx      → /presentation-hub  (NEW)
src/app/(public)/search/page.tsx                → /search
src/app/api/library/file/[id]/route.ts          → gated signed-URL file serving (D-052)
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

- Public site: no auth needed for published content.
- Admin (`/admin/*`): Supabase Auth, email+password; gating in Server Component
  layouts (D-033), not in `proxy.ts`. `proxy.ts` only refreshes session cookies (D-032).
- **Roles:** `super_admin | admin | user` (migration 0030, D-047). Assignment is
  data-driven: `handle_new_user()` (trigger `on_auth_user_created` from 0006,
  rewritten in 0030) reads `user_role_defaults` on signup, falling back to `'user'` (D-048).
- **RLS helpers** (all `LANGUAGE sql SECURITY DEFINER`, `search_path`-pinned, `STABLE`):
  - `is_admin()` — TRUE for admin OR super_admin (used by every existing policy, kept
    by name/signature so 0002-era policies still work).
  - `is_super_admin()` — gates structural/sensitive ops (folder delete, visibility
    toggle, role management).
  - `get_profile_role(uuid)` — reads a profile's role WITHOUT tripping the profiles
    SELECT policies; added 20260622 to break an RLS recursion in the role-change policies.
- **Role-change guard (D-055):** `profiles_update_admin` lets admins update profiles,
  but `role` may change only when the actor `is_super_admin()`; otherwise the new
  value must equal `get_profile_role(id)`. `profiles_update_own` applies the same lock
  to self-updates. Originally inline subqueries (0032); recursion-fixed to use the
  helper in `20260622193001`/`20260622193003`.
- **`user_activity_log`** (audit trail): RLS forced; reads are tiered (super_admin =
  all, admin = own department via `team_members`, every user = own rows); **writes are
  service-role only** — no authenticated write policy, so logs are unforgeable.
- **`profiles_v`**: `SECURITY INVOKER` view joining `profiles` + `auth.users`
  (`last_sign_in_at`, `email_confirmed_at`) + `team_members`; the admin user panel's
  single read source. Source-table RLS applies through it; writes go to the base tables.
- The public site reads the session in `(public)/layout.tsx` to drive role-aware
  affordances (admin upload/manage, "+ Create New Folder"); every mutation re-verifies
  the role server-side.

---

## 11. Search

**Live now:** a `/api/search` route handler backed by the service-role client (queries
`pages` / `documents` / `team_members`), surfaced in the Dashboard search box. It does
**not** use generated `search_vector` columns — the originally planned
`0010_fulltext_search.sql` migration was never created (`0010` is
`fix_brand_card_colors`).

**RAG (in progress, not deferred):** the intelligence-layer groundwork has shipped —
Confluence ingestion + extracted attachments (`confluence_*` tables, migrations
0025–0026), a gold-set Q&A eval set (`gold_set_answers`, 0027–0028), and AI test sets
(0029). Next: embedding evaluation → a `knowledge_chunks` / pgvector store → chat-style
retrieval with the Claude API.

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

The reference implementation is `spec/mockups/v3-01-dashboard.html`. Phase 4 ported the tokens to `src/styles/theme.css`, which is now canonical.

---

## 13. Custom embeds preserved from Webflow

See `EMBEDS_INVENTORY.md`. ~224 KB of custom HTML/CSS/JS extracted from the
original site. Porting status (was planned for "Phase 6", now largely shipped):

- APIX Workflow, Network map, Presentation player, Group structure — **ported** to
  `src/components/hardcoded/apix-*.tsx` (migrations 0014–0016).
- Signature Generator — **ported** (`src/components/hardcoded/email-signature.tsx`,
  4 brand sub-routes).
- Out-of-Office Generator — **ported** (`src/components/hardcoded/out-of-office.tsx`).
- Color Strip Pattern — **ported** into the `color_palette` block
  (`src/components/blocks/color-palette.tsx`).
- IBE Tools Showcase → `/ibe-product-suite` page body — still pending.

(The Jersey Customizer embed targeted `/internal-branding/configurator`, a route that
has since been removed — D-056.)

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

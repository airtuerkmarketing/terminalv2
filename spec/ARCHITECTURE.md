# terminalv2 — Architecture

This document is the **canonical system design** for terminalv2. Every
decision below is locked. Changes require a new entry in `DECISIONS.md` and
an update here.

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
                │  │  • Brand Universe      │  • Dashboard           │ │
                │  │  • 8 brand sections    │  • Page editor         │ │
                │  │  • 39 sub-pages        │  • Asset library       │ │
                │  │  • 4 standalone pages  │  • Document library    │ │
                │  │  • 5 utility pages     │  • Team manager        │ │
                │  │  • /search (text→RAG)  │  • Brand settings      │ │
                │  └────────────────────────┴────────────────────────┘ │
                └────────────────────────────┬─────────────────────────┘
                                             │
                                             ▼
                ┌──────────────────────────────────────────────────────┐
                │  Supabase project: terminalv2   (Frankfurt)          │
                │  ┌──────────────────┬──────────────────────────────┐ │
                │  │  Postgres        │  Storage (4 buckets)         │ │
                │  │  • brands        │  • images   (CDN-cached)     │ │
                │  │  • pages         │  • documents (CDN)           │ │
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

---

## 2. Site structure (56 pages — canonical)

The accurate count is **56 pages**: 13 top-
level + 39 sub-pages + 4 standalone. Every URL below corresponds to one row in
the `pages` table.

### Group A — Brand sections (collapsible parents, 8 brands)

| # | Path | Title | Children |
|---|---|---|---|
| 02 | `/airtuerk-service` | airtuerk Service | 6 |
| 03 | `/airtuerk-holidays` | airtuerk Holidays | 5 |
| 04 | `/atbeds` | atBeds | 6 |
| 05 | `/service-center` | Service Center | 5 |
| 06 | `/ibe-product-suite` | IBE Product Suite | 7 |
| 07 | `/internal-branding` | Internal Branding | 2 |
| 08 | `/airtuerk-apix` | airtuerk APIX | 8 |

### Group B — Landing & utilities

| # | Path | Title | Type |
|---|---|---|---|
| 01 | `/` | Brand Universe | Landing (block-driven) |
| 09 | `/presentation-hub` | Presentation Hub | Block-driven |
| 10 | `/asset-library` | Asset Library | Hardcoded UI |
| 11 | `/documents-library` | Documents Library | Hardcoded UI |
| 12 | `/team` | Team | Hardcoded UI |
| 13 | `/playground` | Playground | Block-driven (sandbox) |

### Standalone pages (no number, not in main sidebar)

| Path | Title | Type |
|---|---|---|
| `/budget26` | Budget 2026 | Block-driven |
| `/ops` | Operations | Block-driven (duty cards) |
| `/image-grid` | Image Grid | Block-driven |
| `/focus-mgzn` | Focus Magazine | Block-driven |

### Full sub-page tree

See `SOURCE_INVENTORY.md §2` for the complete enumeration of all 39 sub-pages
with their original anchor IDs.

---

## 3. Page rendering modes

Every visible URL in the system has a row in the `pages` table — including
hardcoded ones. This is required so the sidebar, number badges, breadcrumbs,
and prev/next navigation always work. The `pages.rendering_mode` column
controls how the page renders:

| `rendering_mode` | Behavior |
|---|---|
| `blocks` | Page renders by reading ordered rows from `blocks` table |
| `hardcoded` | Page renders by mounting a fixed React component (looked up by `pages.component_key`) |

**Pages with `rendering_mode = 'hardcoded'`:**

| Path | `component_key` | Why hardcoded |
|---|---|---|
| `/team` | `team-directory` | Queries `team_members` table, has filter UI |
| `/asset-library` | `asset-library` | Queries `assets` table with filters |
| `/documents-library` | `document-library` | Queries `documents` table with filters |
| `/search` | `search` | RAG chat interface |
| `/airtuerk-apix/workflow` | `apix-workflow` | Interactive drag-rearrange node graph |
| `/airtuerk-service/email-signature` | `email-signature` | Form-driven HTML generator |
| `/airtuerk-holidays/email-signature` | `email-signature` | Same component, branded |
| `/atbeds/email-signature` | `email-signature` | Same component, branded |
| `/service-center/email-signature` | `email-signature` | Same component, branded |
| `/internal-branding/configurator` | `identity-configurator` | Visual identity builder (spec in DECISIONS D-025) |

Hardcoded pages still have a `pages` row (with title, parent_id, sort_order,
etc.) so the sidebar shows them correctly.

---

## 4. Block system

There are **15 block types** plus `raw_html` as an escape hatch.

`color_entry` is NOT a separate block — it's a sub-shape used inside
`color_palette.colors[]` (correction from earlier draft).

### Structure blocks

| Type | Content shape |
|---|---|
| `page_hero` | `{ number?: string, title: string, subtitle?: string }` |
| `description` | `{ html: string }` |
| `page_nav` | `{ prev?: { label, href }, next?: { label, href } }` |

### Brand blocks

| Type | Content shape |
|---|---|
| `color_palette` | `{ colors: ColorEntry[] }` where `ColorEntry = { number, role, name, hex, rgb, cmyk, pantone? }` |
| `typography_specimen` | `{ fontFamily, weights, sampleText, kerningDemo?, sizeScale? }` |
| `type_scale_table` | `{ rows: [{ sizeRange, lineHeight, label, tracking, notes }] }` |
| `logo_showcase` | `{ logos: [{ assetId, variant, background, downloadAssetId, label }] }` |
| `logo_grid` | `{ logos: [{ assetId, label, href? }], layout: 'circles' \| 'tiles' }` |

### Content blocks

| Type | Content shape |
|---|---|
| `asset_block` | `{ previewAssetId, downloads: [{ assetId, label, fileType }] }` |
| `asset_grid` | `{ columns: 2 \| 3 \| 4, items: AssetBlockContent[] }` |
| `document_list` | `{ groups: [{ title, documentIds: string[] }] }` |
| `duty_card` | `{ icon, name, subs: string[] }` |
| `duty_grid` | `{ duties: DutyCardContent[] }` |
| `product_showcase` | `{ productName, description, featureTags: string[], ctaLabel, ctaHref, carouselAssetIds: string[] }` |

### Escape hatch

| Type | Content shape |
|---|---|
| `raw_html` | `{ html: string }` |

### Layout flag (every block)

Every block carries a `layout` field, stored as a column on `blocks`:

```ts
layout: 'full' | 'two-column'
```

`two-column` puts heading on the left (~30%), content on the right (~70%) —
the recurring `.two-blocks-content-grid` pattern in the original site
(70 occurrences across the source HTML).

### Block validation

Every block type has a Zod schema in `src/lib/blocks/schemas.ts`. The schema
files are required reading for any change to a block. Schemas are paired with:

- The TypeScript type (`src/lib/blocks/types.ts`)
- The renderer (`src/components/blocks/{group}/{name}.tsx`)
- The admin form (`src/components/admin/page-editor/block-form.tsx`)
- The registry entry (`src/lib/blocks/registry.ts`)

A "new block type" PR touches exactly these five files, plus a database
migration if the block needs new lookup fields. The schema is the source of
truth — types are inferred from it.

---

## 5. Database schema

Eight tables plus one junction table. Full DDL lives in
`supabase/migrations/0001_initial_schema.sql`.

Summary (full types and constraints in the SQL):

### `brands` — 8 rows (seeded)
Holds the eight airtuerk brands.

### `pages` — 56 rows (seeded in 0005)
Self-referencing tree. Top-level pages have `parent_id IS NULL` and an
explicit `number` (1-13). Sub-pages have `parent_id` set and `number IS NULL`.

`full_path` is auto-computed via a generated column from the parent chain
plus this page's slug. It's UNIQUE.

`rendering_mode` is an enum-style check constraint:
`CHECK (rendering_mode IN ('blocks', 'hardcoded'))`.

### `blocks` — content of `rendering_mode='blocks'` pages
Ordered list per page. `content` is JSONB validated by Zod at the application
layer.

### `assets` — every uploaded image/video/font
Populated in Phase 2 from the manifest. Each row is one file in Supabase
Storage with metadata.

### `documents` — first-class document type
Separate from `assets` because they have semantic structure (category,
language, DE/EN pairs, version). PDFs, DOCX, PPTX, ZIPs.

### `team_members` + `team_member_brands`
63 team members, each may belong to one or more brands. Junction table for
the many-to-many relationship (D-026).

### `settings` — key/value config
Single-row pattern. Site title, footer text, default OG image, etc.

### `profiles` — admin users
Mirrors `auth.users` with a `role` column. Auto-created by trigger when a
new user signs up (D-027).

### Row Level Security

| Table | SELECT (read) | INSERT/UPDATE/DELETE (write) |
|---|---|---|
| `brands` | public | admin only |
| `pages` | public WHERE status='published' | admin only |
| `blocks` | public if parent page is published | admin only |
| `assets` | public | admin only |
| `documents` | public | admin only |
| `team_members` | public | admin only |
| `team_member_brands` | public | admin only |
| `settings` | public | admin only |
| `profiles` | own row only | own row only (limited fields) |

The "admin" check is via `auth.jwt()->>'role' = 'admin'` or via
`EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`.

---

## 6. Storage buckets

Four buckets in Supabase Storage, all `eu-central-1`:

### `images/` (public, aggressive CDN cache)

```
brand-logos/{brand-slug}/...
icons/...
desktop-backgrounds/...
team-backgrounds/...
product-shots/...
stock-photography/...
thumbnails/...
favicon/...
misc/...
```

### `documents/` (public for v1, designed to lock down later)

```
framework-agreements/
partner-agreements/
sepa-mandates/
master-decks/
nda/
api-docs/
magazines/
bank-info/
hr-forms/
logo-packages/
reference/
misc/
```

### `videos/` (public, range-request friendly for streaming)

```
master/
posters/
```

### `fonts/` (public, immutable 1-year cache)

```
inter/
general-sans/
icon-fonts/        (legacy, prefer lucide-react)
```

Bucket creation lives in
`supabase/migrations/0003_storage_buckets.sql`.

---

## 7. Routing model

### Static and hardcoded routes (fixed file paths)

```
src/app/(public)/page.tsx                  → /            (block-driven landing, special case for full_path='/')
src/app/(public)/team/page.tsx             → /team        (hardcoded UI shadows DB row)
src/app/(public)/asset-library/page.tsx    → /asset-library
src/app/(public)/documents-library/page.tsx → /documents-library
src/app/(public)/search/page.tsx           → /search
```

### Dynamic catch-all (everything else)

```
src/app/(public)/[...slug]/page.tsx
```

Handles `/airtuerk-service`, `/airtuerk-service/logos`, `/budget26`, etc.

**Resolution algorithm:**

1. Static file paths above match first (Next.js routing order)
2. `[...slug]/page.tsx` builds `full_path` from `params.slug`
3. Query: `SELECT * FROM pages WHERE full_path = $1 AND status = 'published'`
4. If found:
   - If `rendering_mode='blocks'` → load blocks, render via `BlockRenderer`
   - If `rendering_mode='hardcoded'` → mount component by `component_key`
5. If not found → Next.js `not-found.tsx`

### Next.js 15 async API correction

In Next.js 15, `params`, `searchParams`, `cookies()`, and `headers()` are
async. Example for the catch-all route:

```tsx
// src/app/(public)/[...slug]/page.tsx
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const page = await getPageByPath(fullPath);
  // ...
}
```

Always await `params` before reading from it. Same rule for `cookies()` and
`headers()` in Server Components and Route Handlers.

---

## 8. Authentication & access

- **Public site:** no auth needed. Public-read by default.
- **Admin (`/admin/*`):** Supabase Auth, email+password.
  Middleware checks session and redirects to `/login` if absent.
- **Roles:** stored in `profiles.role` (`admin` | `editor` | `viewer`).
  v1 uses only `admin`.
- **First admin:** created manually via Supabase dashboard (D-028).
  Auto-profile-creation trigger gives them `role = 'admin'` if email
  matches the seeded `INITIAL_ADMIN_EMAIL` env var.

Future frontend auth (members, partner-gated content) is feasible without
schema changes — the table structure already supports it.

---

## 9. Search

Two phases.

### Phase A — Postgres full-text search (launches with v1)

**Not** in 0001 migration. Added in a later migration once content exists.
Trying to maintain `tsvector` columns before any content is uploaded creates
churn. Sequence:

1. v1 launches with text content in the DB
2. Migration `0007_fulltext_search.sql` adds:
   - `pages.search_vector` (generated column from title + meta_description)
   - `documents.search_vector` (generated column from title + description)
   - `team_members.search_vector` (generated column from name + position)
   - Block text extracted into a `block_searchable_text` view
   - GIN indexes on all four
3. `/api/search` route handler uses `to_tsquery` against these

### Phase B — RAG (deferred, separate project)

- Enable pgvector extension
- Embeddings of pages, blocks, documents
- Chat-style UI at `/search`
- Powered by Claude API
- Stubs reserved in `src/lib/search/rag.ts` from day one

---

## 10. Caching & revalidation

- Public page rendering: `revalidate = 3600` (1 hour default)
- Admin publish action: calls `revalidatePath(page.full_path)` plus the
  parent paths so the sidebar refreshes
- Asset URLs: immutable. Once an asset is in Storage, its public URL never
  changes. Replace = new upload + new URL + update block references.
- Sidebar tree: fetched once per request in a Server Component, cached
  via React's request memoization

---

## 11. Anti-features (explicitly NOT in v1)

To prevent scope creep:

- Frontend user accounts (table structure supports it, feature is off)
- Multi-language CMS content (`pages.language` field is reserved)
- Version history / revisions (Supabase PITR covers DR for v1)
- Multi-reviewer publishing workflow
- Webflow DevLink integration
- Third-party CMS (Payload, etc.) — re-evaluated only after Phase 5
- Real-time collaborative editing
- Public API
- Multi-tenant or white-label support

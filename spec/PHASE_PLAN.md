# terminalv2 — Phase-by-Phase Execution Plan

What gets built, in what order, with exit criteria.

---

## Phase 0 — Planning ✅ COMPLETE

All specification documents written, all decisions locked.

**Pending:** External infrastructure provisioning before Phase 1.

---

## Phase 1 — Infrastructure provisioning

**Goal:** Empty but fully-configured Supabase, Vercel, GitHub projects.

### Steps

1. **GitHub** (user-driven)
   - Create empty repo `github.com/airtuerkmarketing/terminalv2` (private)
   - Grant Claude write access via Claude.ai GitHub connector OR
     fine-grained personal access token

2. **Supabase** (Claude-driven via MCP)
   - `list_organizations` → user picks
   - `get_cost` (project) → user confirms via `confirm_cost`
   - `create_project` → `terminalv2`, `eu-central-1`, free tier
   - Wait ~2 minutes for provisioning
   - `get_project_url` + `get_publishable_keys` → capture credentials

3. **Vercel** (Claude-driven via MCP)
   - Create new project under team `airtuerk-service-gmbhs-projects`
   - Name: `terminalv2`
   - Link to GitHub repo
   - Set environment variables (see `.env.example`)

4. **Schema migrations** (Claude-driven via Supabase MCP)
   - `apply_migration` each of:
     - `0001_initial_schema.sql`
     - `0002_rls_policies.sql`
     - `0003_storage_buckets.sql`
     - `0004_seed_brands.sql`
     - `0005_seed_pages.sql`
     - `0006_profiles_trigger.sql`
   - Set the initial admin email config:
     `ALTER DATABASE postgres SET app.initial_admin_email = '<email>';`

5. **First admin user** (manual, user-driven)
   - Supabase Studio → Authentication → Users → Add user
   - Email: matches `INITIAL_ADMIN_EMAIL`
   - Trigger from 0006 auto-sets role='admin'

### Exit criteria

- [ ] GitHub repo exists and is accessible
- [ ] Supabase project shows green status, region eu-central-1
- [ ] 9 tables visible in Supabase Studio (brands, pages, blocks, assets,
      documents, team_members, team_member_brands, settings, profiles)
- [ ] 4 storage buckets visible (images, documents, videos, fonts)
- [ ] 8 brand rows in DB (verified via `SELECT count(*) FROM brands`)
- [ ] 56 page rows in DB (verified via `SELECT count(*) FROM pages` — the
      sanity check in 0005 enforces this)
- [ ] Vercel project linked to repo, env vars set
- [ ] First admin user can log in via Supabase Studio (no app yet)
- [ ] Run `get_advisors` (Supabase MCP) — no critical security warnings

---

## Phase 2 — Asset upload

**Goal:** Every file from the Webflow zip lives in Supabase Storage with
proper organization. Database tables (assets, documents, team_members)
populated.

### Steps

1. **Generate manifests** (Claude, no infrastructure touched)
   - `asset-manifest.json` — ~708 image files mapped to bucket + path
   - `document-manifest.json` — 47 documents with category, language, brand,
     version, pair relations
   - `team-manifest.json` — 63 team members extracted from team.html with
     department, position, brand assignments
   - User reviews all three, approves or corrects

2. **Bulk upload** (script-driven, runs locally or via Claude MCP)

   **Critical ordering** (required by FK constraints):

   For each manifest entry, the script must:

   a. Upload the file to its destination bucket
   b. Insert a row into `assets` with `bucket`, `storage_path`, `public_url`, `mime_type`, etc.
   c. **Only after the asset row exists**: if it's a document, insert a `documents` row
      referencing `asset_id`. If it's a team member avatar, set `team_members.avatar_asset_id`.

   Why this matters:
   - `documents.asset_id` is `NOT NULL REFERENCES assets ON DELETE RESTRICT` — the documents
     insert fails if the asset row doesn't exist yet.
   - Same applies to `brands.logo_asset_id`, `pages.og_asset_id`, `team_members.avatar_asset_id`,
     `documents.preview_asset_id` — though all of those are nullable, so they can be backfilled
     in a later step.

   **Row counts after Phase 2:**
   - `assets`: ~771 rows (708 images + 47 documents + 4 videos + 12 fonts)
   - `documents`: ~30 rows (every PDF/DOCX/PPTX/ZIP that is partner-facing)
   - `team_members`: 63 rows
   - `team_member_brands`: ~70 rows (some members on multiple brands)

   Every file in Supabase Storage gets exactly one `assets` row. Documents additionally get
   a `documents` row.

   For team members: insert appropriate `team_member_brands` rows referencing the relevant
   brands. The `is_primary` boolean marks the member's main brand affiliation.

3. **Backfill FK references**
   - Set `brands.logo_asset_id` for each brand
   - Set `pages.og_asset_id` for landing + key pages

### Exit criteria

- [ ] All ~771 files (708 images + 47 docs + 4 videos + 12 fonts) visible
      in Supabase Storage in correct buckets
- [ ] `assets` table row count matches Storage object count
- [ ] `documents` table has ~30+ rows with proper category/language
- [ ] `team_members` table has 63 rows
- [ ] `team_member_brands` populated for all members
- [ ] Spot-check: 5 random asset public URLs return HTTP 200
- [ ] Spot-check: 1 random document URL downloads correctly

---

## Phase 3 — Next.js scaffold

**Goal:** Empty but bootable app with auth and admin shell.

### Steps

1. **Initialize Next.js 15**
   ```bash
   pnpm create next-app@latest terminalv2 \
     --typescript --tailwind --app --src-dir --import-alias "@/*"
   ```

2. **Install dependencies**
   - Core: `@supabase/supabase-js`, `@supabase/ssr`
   - UI: `lucide-react`, shadcn/ui (`npx shadcn@latest init`)
   - Validation: `zod`
   - Utility: `clsx`, `tailwind-merge`, `class-variance-authority`
   - Forms: `react-hook-form`, `@hookform/resolvers`
   - Dev: `@types/node`, `eslint-config-next`

3. **Configure**
   - `next.config.ts` — Supabase Storage as remote image pattern, headers
   - `tailwind.config.ts` — brand colors, font families
   - `tsconfig.json` — strict mode, `verbatimModuleSyntax`
   - `pnpm-workspace.yaml` (if monorepo later)
   - Self-host fonts (Inter, GeneralSans) via `next/font/local`

4. **Supabase clients** (`src/lib/supabase/`)
   - `client.ts` — browser client using publishable key
   - `server.ts` — server client with cookies (Next.js 15 async)
   - `middleware.ts` — session refresh helper
   - `admin.ts` — service-role client (server-only)

5. **Generate database types**
   - Script: `pnpm db:types` → `npx supabase gen types typescript --project-id <ref> > src/types/database.ts`

6. **Auth middleware** — `src/middleware.ts`
   - Refresh session on every request
   - Redirect to `/login` for unauthenticated requests to `/admin/*`

7. **Layouts**
   - Root `layout.tsx` — fonts, theme provider
   - `(public)/layout.tsx` — sidebar + content shell
   - `(admin)/admin/layout.tsx` — admin sidebar + topbar

8. **Login page** — `/login`
   - Supabase Auth UI (email + password)
   - On success → `/admin`

9. **Empty admin dashboard** — `/admin/page.tsx`
   - Placeholder dashboard, confirms auth + role works

10. **CI/CD basics**
    - `.github/workflows/ci.yml` — typecheck + lint on PR
    - Vercel auto-deploy works

### Exit criteria

- [ ] `pnpm dev` runs without errors against remote Frankfurt Supabase
- [ ] Vercel preview deploys successfully on PR
- [ ] Visiting `/admin` while unauthenticated redirects to `/login`
- [ ] Logging in as admin user redirects to `/admin`
- [ ] Database types compile and import correctly
- [ ] `pnpm typecheck` and `pnpm lint` pass

---

## Phase 4 — Public frontend

**Goal:** Site visually 1:1 with current terminal.airtuerk.de.

### Steps

1. **Sidebar component** — reads page tree from DB, renders 2 groups
2. **Block renderer** — master switch on `block.type`, 15 components + raw_html
3. **Catch-all route** — `(public)/[...slug]/page.tsx`
4. **Landing page** — `(public)/page.tsx` queries `full_path = '/'`
5. **Hardcoded route files** — `/team`, `/asset-library`, `/documents-library`,
   `/search` (these route files use the `pages` row for metadata and sidebar
   context, then render their hardcoded UI)
6. **Footer**
7. **Mobile responsive**

### Exit criteria

- [ ] Every URL from the 56-page tree returns a working page
- [ ] Sidebar renders correctly with active state
- [ ] Visual diff acceptable vs current site (indistinguishable to casual eye)
- [ ] Asset URLs resolve from Supabase Storage
- [ ] Mobile responsive verified at 375px, 768px, 1280px

---

## Phase 5 — Admin CMS

**Goal:** Buhara can manage all content via `/admin`.

### Steps

1. **Admin shell polish** — sidebar, topbar, theme, Cmd-K palette
2. **Page management** — list, edit metadata, block editor, live preview, publish
3. **Asset management** — grid view, upload, edit, replace, delete
4. **Document management** — table view, filter, edit
5. **Team management** — table view, filter by department, edit
6. **Brand management** — edit name, logo, color, tagline
7. **Settings** — site-wide config

### Exit criteria

- [ ] Buhara can edit every content type end-to-end through `/admin`
- [ ] Publishing reflects on public site within seconds via `revalidatePath`
- [ ] Cmd-K palette navigates to any page/asset/document

---

## Phase 6 — Hardcoded interactives

**Goal:** Restore the special components that don't fit the block system.

### Steps

1. **Team directory** (`/team`) — search, filter by department/brand, grid
2. **APIX Workflow** (`/airtuerk-apix/workflow`) — React Flow node graph
3. **Email Signature Generator** (4 brand-routes share one component)
4. **Identity Configurator** (`/internal-branding/configurator`) — per D-025

### Exit criteria

- [ ] Each interactive matches or exceeds current site's behavior
- [ ] Underlying data editable via admin (workflow nodes, templates)

---

## Phase 7 — Polish + cutover

**Goal:** Production launch on terminal.airtuerk.de.

### Steps

1. **Author `0007_fulltext_search.sql`** — adds generated `search_vector` columns
   to `pages`, `documents`, `team_members`, a `block_searchable_text` view, and
   GIN indexes. Apply via Supabase MCP. Required for `/api/search` to work in v1.
2. Performance audit (Lighthouse, Core Web Vitals)
3. Accessibility audit (Lighthouse a11y, keyboard nav, screen reader)
4. SEO — sitemap.xml, robots.txt, OG tags per page
5. Security review — CSP headers, rate limiting, RLS audit
6. DNS cutover from Webflow → Vercel
7. Monitor 24 hours
8. Tear down Webflow site

### Exit criteria

- [ ] `0007_fulltext_search.sql` applied, `/api/search` returns results
- [ ] DNS resolves to Vercel
- [ ] All pages load, all assets work
- [ ] Lighthouse: 90+ across performance, a11y, best-practices, SEO
- [ ] No console errors in production

---

## Phase 8 — Search → RAG (deferred, separate project)

Not estimated here. Triggered after Phase 7 is stable.

Steps include: enable pgvector, embedding pipeline (Edge Function or Vercel
Function), chat UI at `/search`, RAG retrieval + Claude API integration,
citations.

---

## Estimating effort (rough)

| Phase | Sessions |
|---|---|
| 1 | 1 |
| 2 | 1-2 |
| 3 | 1-2 |
| 4 | 3-5 |
| 5 | 4-6 |
| 6 | 2-3 |
| 7 | 1-2 |
| **Total to v1 launch** | **13-21 sessions** |
| 8 | separate scope |

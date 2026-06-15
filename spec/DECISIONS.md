# terminalv2 — Locked Design Decisions

Decision log. Each entry: choice, alternatives considered, rationale. Don't
change a decision below without adding a new entry that supersedes it.

---

## D-001 — No Webflow dependency
**Decision:** Zero runtime dependency on Webflow. The static export (zip) seeds
content and assets, then is no longer used.
**Alternatives:** DevLink keeps Webflow as design source — rejected.
**Rationale:** Full code ownership.

## D-002 — Single Next.js app, two route groups
**Decision:** Frontend and admin in one project, `(public)` and `(admin)`
route groups. Shared backend, shared components.
**Rationale:** One deploy, one auth, one DB. Standard modern pattern.

## D-003 — Nested routes for sub-items
**Decision:** Sub-items are real URLs (`/airtuerk-service/logos`), not
hash-anchors.
**Rationale:** Better SEO, faster loads, easier CMS editing, future-proof.

## D-004 — Block-based content model with Zod schemas
**Decision:** Pages = ordered list of typed blocks. JSONB content validated by
Zod schemas at the application layer.
**Rationale:** Standard pattern (Notion, Webflow CMS, Sanity). Adding a block
type is exactly five edits (schema, type, renderer, form, registry).

## D-005 — Block taxonomy: 15 + raw_html
**Decision:** Initial set:
Structure: `page_hero`, `description`, `page_nav`
Brand: `color_palette`, `typography_specimen`, `type_scale_table`,
`logo_showcase`, `logo_grid`
Content: `asset_block`, `asset_grid`, `document_list`, `duty_card`,
`duty_grid`, `product_showcase`
Escape: `raw_html`
**Note:** `color_entry` is a sub-shape inside `color_palette.colors[]`, not a
standalone block.
**Rationale:** Derived from systematic analysis of actual source HTML.

## D-006 — Some routes are hardcoded
**Decision:** These routes mount fixed React components instead of rendering
blocks: `/team`, `/asset-library`, `/documents-library`, `/search`,
`/airtuerk-apix/workflow`, all `email-signature` paths,
`/internal-branding/configurator`. They still have a `pages` row for sidebar
purposes (see D-021).
**Rationale:** Some UI is too dynamic or specific to fit a block system.

## D-007 — Four storage buckets
**Decision:** `images`, `documents`, `videos`, `fonts`.
**Alternatives:** Single bucket — rejected.
**Rationale:** Separate RLS, separate cache strategies. Documents likely go
partner-gated in the future.

## D-008 — Catch-all routing
**Decision:** `(public)/[...slug]/page.tsx` handles every DB-driven page.
Static file routes shadow it where needed.
**Rationale:** Adding a page is a DB insert. No code change required.

## D-009 — Explicit page numbering
**Decision:** `pages.number` is explicit (1-13) for top-level pages, NULL
for sub-pages and standalone pages.
**Rationale:** Numbers are intentional ("11" is always Documents Library).
Decoupling from sort order means renumbering doesn't require reordering.

## D-010 — Vercel-style admin aesthetic
**Decision:** Admin UI follows Vercel dashboard visual language: light
default, clean white, geometric, mono accents, generous whitespace.
shadcn/ui as primitives.
**Rationale:** Right register for content management.

## D-011 — Dark mode deferred
**Decision:** Light only in v1, both frontend and admin.

## D-012 — Supabase Frankfurt (eu-central-1)
**Decision:** Project provisioned in Frankfurt.
**Rationale:** User location, EU partners, GDPR proximity.

## D-013 — Free tier now, Pro later
**Decision:** Supabase free tier for development. Upgrade to Pro
($25/month) when traffic or storage justifies it.

## D-014 — Asset URLs locked at upload time
**Decision:** Manifest defines the final bucket and path for every file
BEFORE any upload. Files never move or rename after that.
**Rationale:** URL stability across block references.

## D-015 — Documents are first-class
**Decision:** Separate `documents` table with category, language, version,
DE/EN pair_id. Not a row in `assets` with extra tags.
**Rationale:** ~47 documents with real semantic structure deserve proper
columns, not JSON tags.

## D-016 — Team is a database table
**Decision:** 63 team members in `team_members` table. `/team` is a
hardcoded route with filter/search UI.
**Rationale:** Structured data, not editorial content.

## D-017 — RAG search deferred to Phase 8
**Decision:** Phase A (launch) uses Postgres full-text search. Phase B adds
RAG using pgvector + Claude API.
**Rationale:** RAG is a real product feature, not a sprinkle. Worth doing
right once content is stable.

## D-018 — Project naming
**Decision:** GitHub: `airtuerkmarketing/terminalv2`. Supabase project:
`terminalv2`. Vercel project: `terminalv2`.

## D-019 — Presentation Hub is a utility, not a brand
**Decision:** Moved from brand group (was 09) to utility group.
**Rationale:** No logo/colors/master-deck pattern like real brands.

## D-020 — English URL slugs
**Decision:** URL slugs in English, even though page content is bilingual.
**Rationale:** Slugs are technical infrastructure. Content lives in DB
fields.

---

## D-021 — Every visible route has a `pages` row
**Decision:** Hardcoded routes still have a `pages` table row. The
`rendering_mode` column distinguishes how the page renders (`blocks` vs
`hardcoded`).
**Alternatives:** Hardcoded routes only as file paths — rejected.
**Rationale:** The sidebar reads from `pages` and must show all visible
routes including `/team`, `/airtuerk-apix/workflow`, etc. Sidebar tree,
breadcrumbs, prev/next nav, number badges — all driven by `pages`.

## D-022 — Landing page is block-driven, `full_path = '/'`
**Decision:** The landing page (`/`) is a block-driven page like any other,
seeded as a row in `pages` with `full_path = '/'` and `number = 1`. It's
rendered by `(public)/page.tsx` which queries by this fixed path.
**Alternatives:** Special-case hardcoded landing — rejected.
**Rationale:** Consistency. Landing changes are CMS edits, not code
changes.

## D-023 — Page count is 56
**Decision:** The system has **56 pages**: 13 top-level (01-13) + 39 sub-
pages + 4 standalone pages (budget26, ops, image-grid, focus-mgzn).
SOURCE_INVENTORY.md is the canonical enumeration.
**Rationale:** Counted directly from the source HTML zip — each sub-page
anchor in the original sidebar becomes its own nested route.

## D-024 — Local dev runs against remote Supabase
**Decision:** `pnpm dev` connects to the remote Frankfurt Supabase project
directly. No Docker, no local Supabase stack required.
**Alternatives:** Local Docker Supabase via CLI — rejected for v1.
**Rationale:** Simpler setup, no Docker dependency, free tier covers
development load. If branching becomes needed, Supabase Branching (a paid
feature) is the path.

## D-025 — Identity Configurator scoped now
**Decision:** The Identity Configurator (`/internal-branding/configurator`)
is a form-driven tool that:
1. Accepts inputs: brand selection, role/department, name, email, phone,
   social handles
2. Generates downloadable assets: PDF letterhead, HTML email signature
3. Produces from templates stored in the database

Initial templates: airtuerk + airtuerk Holidays email signatures and
letterheads. Full UX spec in `spec/component-specs/identity-configurator.md`
when Phase 6 begins.

**Rationale:** Removes the "to be specified" blocker. Spec is high-level
enough to plan around, detailed enough to estimate.

## D-026 — Team-to-brand is many-to-many
**Decision:** `team_member_brands` junction table. A team member can belong
to multiple brands. A brand can have multiple members.
**Alternatives:** Single text column `team_members.brand` — rejected.
**Rationale:** 63 people across 8 brands include cross-brand roles
(observed in screenshot: "airtuerk Holidays" appears alongside other
filters).

## D-027 — Profile creation trigger
**Decision:** A Postgres trigger on `auth.users` inserts a `profiles` row
automatically on signup. The role defaults to `viewer`. If the new user's
email matches `app.initial_admin_email` (a Postgres config setting), the
role is set to `admin`.
**Migration:** `0006_profiles_trigger.sql`.
**Rationale:** Without this, first-admin login lands with no profile row
and the role check fails.

## D-028 — First admin via Supabase Studio
**Decision:** The first admin user is created manually in the Supabase
Studio UI (Authentication → Users → Add user). Email matches
`INITIAL_ADMIN_EMAIL` env var. The D-027 trigger sets `role = 'admin'`.
**Rationale:** Bootstraps without a chicken-and-egg.

## D-029 — Supabase keys (modern naming)
**Decision:** Supabase projects created after Nov 2025 issue
`sb_publishable_...` and `sb_secret_...` keys, NOT anon/service_role.
terminalv2 uses these. Env variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  (browser-safe, replaces anon)
- `SUPABASE_SECRET_KEY`  (server-only, replaces service_role)

**Rationale:** Following Supabase's current key model.

## D-030 — Migrations run via Supabase MCP for v1
**Decision:** Migrations are applied via the Supabase MCP `apply_migration`
tool during initial setup and through the conversation. Local Supabase CLI
(`supabase db push`) is set up in Phase 3 for completeness, but the MCP is
the primary path for v1.
**Alternatives:** CLI-only — rejected as primary because the workflow is
Claude-driven via MCP.
**Rationale:** Migrations applied via MCP are tracked the same way as CLI
(both write to `supabase_migrations.schema_migrations`).

---

## Anti-decisions (explicitly NOT doing)

- Not using Payload CMS in v1 (re-evaluate after Phase 5)
- Not splitting admin and frontend (D-002)
- Not building a separate API server
- Not real-time collaborative editing
- Not multi-tenant
- Not public API
- Not auto-translation

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
**Rationale:** One deploy, one auth, one DB.

## D-003 — Nested routes for sub-items
**Decision:** Sub-items are real URLs (`/airtuerk-service/logos`), not
hash-anchors.
**Rationale:** Better SEO, faster loads, easier CMS editing.

## D-004 — Block-based content model with Zod schemas
**Decision:** Pages = ordered list of typed blocks. JSONB content validated by
Zod schemas at the application layer.
**Rationale:** Adding a block type is exactly five edits.

## D-005 — Block taxonomy: 15 + raw_html
**Decision:** Initial set:
Structure: `page_hero`, `description`, `page_nav`
Brand: `color_palette`, `typography_specimen`, `type_scale_table`,
`logo_showcase`, `logo_grid`
Content: `asset_block`, `asset_grid`, `document_list`, `duty_card`,
`duty_grid`, `product_showcase`
Escape: `raw_html`
**Note:** `color_entry` is a sub-shape inside `color_palette.colors[]`.

## D-006 — Some routes are hardcoded
**Decision:** These routes mount fixed React components instead of rendering
blocks: `/team`, `/asset-library`, `/documents-library`, `/search`, `/presentation-hub`,
`/ibe-product-suite`, `/airtuerk-apix/workflow`, `/airtuerk-apix/global-network`,
all `email-signature` paths, `/internal-branding/configurator`.
**Updated by:** D-040 (Presentation Hub) and D-041 (IBE landing) in Phase 3.5;
D-056 removed `/internal-branding/configurator` from this list.

## D-007 — Four storage buckets ⚠️ SUPERSEDED
**Decision:** `images`, `documents`, `videos`, `fonts`.
**Superseded (2026-06-22):** the bucket set has since grown to nine as features
shipped — added `confluence-attachments` (migration 0025), `library` (0031, private —
D-052), `presentations` (0033), and `avatars` (`20260621142305`). A ninth bucket,
`rag-knowledge`, exists in the live DB but has **no creating migration** (made
out-of-band; only referenced as "future" in 0025). This is accumulated reality, not a
new decision — current set in ARCHITECTURE §8.

## D-008 — Catch-all routing
**Decision:** `(public)/[...slug]/page.tsx` handles every DB-driven page.
Static file routes shadow it where needed.

## D-009 — Explicit page numbering
**Decision:** `pages.number` is explicit (1-13) for top-level pages, NULL
for sub-pages and standalone pages.

## D-010 — Vercel-style admin aesthetic ⚠️ SUPERSEDED
**Status:** Superseded by **D-034** in Phase 3.5.
**Original decision:** Vercel dashboard visual language, light only, geometric, mono accents.
**Replaced by:** iOS 18 Liquid Glass design system. See `DESIGN_SYSTEM.md`.

## D-011 — Dark mode deferred ⚠️ SUPERSEDED
**Status:** Superseded by **D-035** in Phase 3.5.
**Original decision:** Light only in v1.
**Replaced by:** Dark mode allowed alongside light mode (toggleable).

## D-012 — Supabase Frankfurt (eu-central-1)
**Decision:** Project provisioned in Frankfurt.

## D-013 — Free tier now, Pro later
**Status:** Pro tier active from Phase 1. Org-level upgrade decision by user.

## D-014 — Asset URLs locked at upload time
**Decision:** Manifest defines final bucket and path BEFORE upload.

## D-015 — Documents are first-class
**Decision:** Separate `documents` table.

## D-016 — Team is a database table
**Decision:** 63 team members in `team_members` table. `/team` is hardcoded.

## D-017 — RAG search deferred to Phase 8
**Decision:** Phase A uses Postgres full-text search. Phase B adds RAG.

## D-018 — Project naming
**Decision:** GitHub: `airtuerkmarketing/terminalv2`. Supabase: `terminalv2`. Vercel: `terminalv2`.

## D-019 — Presentation Hub is a utility, not a brand
**Decision:** Moved from brand group to utility group.
**Reinforced by:** D-040 in Phase 3.5 — moved to "Resources" section in sidebar with hardcoded sectioned UI.

## D-020 — English URL slugs
**Decision:** URL slugs in English, content bilingual.

## D-021 — Every visible route has a `pages` row
**Decision:** Hardcoded routes still have a `pages` row.
**Reinforced by:** D-038 in Phase 3.5 — sidebar reads from `pages.hidden_in_sidebar`.

## D-022 — Landing page is block-driven, `full_path = '/'`
**Decision:** The landing is a block-driven page with `full_path = '/'`.

## D-023 — Page count is 56 ⚠️ SUPERSEDED
**Status:** Superseded by **D-042** in Phase 3.5.
**Original count:** 56 pages.
**Replaced by:** **52 pages** after removing 4 standalone pages (budget26, ops, image-grid, focus-mgzn) in Phase 3.5.

## D-024 — Local dev runs against remote Supabase
**Decision:** `pnpm dev` connects to remote Frankfurt Supabase.

## D-025 — Identity Configurator scoped ⚠️ CLOSED (see D-056)
**Decision:** Form-driven tool generating PDF letterhead + HTML email signature.
**Reinforced by:** D-041 — Jersey Customizer is the Phase 6 visual implementation.
**Closed by:** D-056 — the `/internal-branding/configurator` route was removed
(never built; no backing component).

## D-026 — Team-to-brand is many-to-many
**Decision:** `team_member_brands` junction table.

## D-027 — Profile creation trigger
**Decision:** Postgres trigger auto-creates profile row on signup.

## D-028 — First admin via Supabase Studio
**Decision:** Manual creation via Studio UI.

## D-029 — Supabase keys (modern naming)
**Decision:** Use `sb_publishable_...` and `sb_secret_...` not anon/service_role.

## D-030 — Migrations run via Supabase MCP for v1
**Decision:** Migrations applied via MCP `apply_migration`.

## D-031 — Use Next.js 16 instead of 15
**Date:** 2026-06-15. Adopted Next.js 16.2.9 (stable line).

## D-032 — Use `proxy.ts` instead of `middleware.ts` (Next.js 16 convention)
**Date:** 2026-06-15. `src/proxy.ts` exporting `proxy()` function.

## D-033 — Auth-gating in Server Component layouts, not in proxy
**Date:** 2026-06-15. Per CVE-2025-29927 guidance. Layout calls `redirect()` if no session/role.

---

# Phase 3.5 — Design system + brand hierarchy

These decisions were made during Phase 3.5 (2026-06-15) after the initial scaffold
was working in production. Mockup iterations (v1, v2, v3) led to a comprehensive
design overhaul. See `BUILD_LOG.md` Phase 3.5 entry for the full sequence.

---

## D-034 — Adopt iOS 18 Liquid Glass design system
**Date:** 2026-06-15
**Status:** Adopted. Supersedes D-010.
**Context:** Original spec called for a "Vercel-style admin aesthetic" — flat, white, geometric. After three mockup iterations, the visual direction shifted to a more premium, calm, glass-material system adapted from the `airtuerk_intelligence` repository.
**Decision:** Use the iOS 18 Liquid Glass system documented in `DESIGN_SYSTEM.md`:
- Two themes: `ios18-light` (default), `ios18-dark`
- Glass surfaces with `backdrop-filter: blur()` and translucent backgrounds
- Ambient orb backgrounds (toggleable, animated, respect `prefers-reduced-motion`)
- Specular `.edge-liquid-glass` accents on premium surfaces
- Token system with CSS custom properties (light/dark theme swap via `[data-theme]`)
**Trade-offs:** More complex CSS, requires browsers that support `backdrop-filter` (all modern). Fallback: solid surfaces. Worth it — the visual quality lifts the entire product.
**Source:** Reference implementation in `spec/mockups/v3-01-dashboard.html`.

## D-035 — Dark mode is supported (was deferred)
**Date:** 2026-06-15
**Status:** Adopted. Supersedes D-011.
**Context:** D-011 deferred dark mode to keep v1 scope small. With the Liquid Glass system, dark mode is essentially free — same tokens, swapped values via `[data-theme="ios18-dark"]` selector.
**Decision:** Both light and dark themes ship in v1. Default is light. Toggle button in top-right control bar. User preference persists in cookie.
**Trade-offs:** Need to verify all brand colors work on dark backgrounds. Done — Quantum Blue at `#0A9EFF` is brighter for dark theme; all other tokens have dark variants.

## D-036 — Quantum Blue as the UI accent color
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** Initial mockup v1 used Torch Red (`#ED1C24`) as the accent — too aggressive, visually overpowering. User feedback: "too much red in UI".
**Decision:** Quantum Blue (`#0A82DF` light / `#0A9EFF` dark) is the only accent color in UI chrome — used for:
- Active sidebar items
- Focus rings
- Primary buttons
- Pulse dots
- Link hovers

**Strict rule:** Torch Red, Orient Blue, Tiara Grey only appear when rendering brand identity content (color palette blocks, brand logo marks). Never in chrome.

**Trade-offs:** None significant. Quantum Blue is part of the airtuerk UX/UI palette (from the Colors UX/UI brand video), so it's brand-correct.

## D-037 — Three document download styles, default = preview cards
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** Webflow site uses two different download presentations on different pages (compact rows vs. large image cards). Both have merit. User picked preview cards as default.
**Decision:** `document_list` block has a `style` field with three options:
1. `list_rows` — compact rows with filetype badge + filename + meta + download icon
2. `preview_cards` (**default**) — document thumbnail card with filetype-pill download links below (Image 1 reference)
3. `image_outline_button` — photographed document on colored/wood background + outline CTA button (Image 2 reference)

Plus a per-document override column (`documents.download_style`) so a specific doc can pick a different style than the site default.

**Trade-offs:** Three renderers instead of one. The visual variety is worth the implementation cost — different document types deserve different presentations.

## D-038 — Sidebar structure and IBE expandable section
**Date:** 2026-06-15
**Status:** Adopted.
**Decision:** The sidebar has three sections (Dashboard / Brands & Products / Resources) with horizontal dividers. The middle section contains the 7 top-level brands. IBE Product Suite is the only expandable item — a chevron click toggles its 6 visible sub-products (plus 1 hidden: airLounge).

Brand visibility comes from three DB fields:
- `brands.sidebar_section` — `brands` | `resources` | `hidden`
- `brands.parent_id` — for nested products
- `pages.hidden_in_sidebar` — for one-off hidden pages (Playground, airLounge)

The renderer in `src/components/shell/sidebar.tsx` (Phase 4) builds the tree from these.

**Trade-offs:** More DB columns to maintain. Worth it — admin can change visibility without code change.

## D-039 — Brand hierarchy with `parent_id`
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** The original spec treated all 8 brands as flat siblings. After Phase 3.5 discussion: multicheck, cockpit, myTransfer, myBooking, rentalCar, myStats, airLounge are not standalone brands — they are **products inside the IBE Product Suite family**.
**Decision:** Add `brands.parent_id` (uuid, references `brands.id`, nullable). Top-level brands have `parent_id IS NULL`. IBE products have `parent_id = (id of IBE Product Suite)`. Also adds `brands.is_product` boolean to distinguish "brand" vs "product within suite" — affects rendering (brand-card vs product-card).
**Migration:** `0007_brand_hierarchy_and_sidebar.sql` + `0008_restructure_brands.sql`.
**Trade-offs:** Self-referencing FK adds complexity to queries. The sidebar tree query needs to handle 2 levels. Acceptable — keeps the data model honest.

## D-040 — Presentation Hub as a Resources item with sectioned doc list
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** Presentation Hub was originally a "brand" page (sort 80) with block-driven content. Reality: it's a **collection of presentation decks** organized by audience (Sales / General / Executive / etc.) — a sectioned document list.
**Decision:**
- Move Presentation Hub from "Brands" sidebar section to "Resources"
- Change rendering to hardcoded with `component_key = 'presentation-hub'`
- Sections defined in `settings.presentation_hub.sections` JSONB (admin-editable)
- Each document has a `presentation_section` field (FK to section slug) that places it in the right section
- Within each section, documents render as `list_rows` style (Option 1) by default

**Trade-offs:** Another hardcoded component (per D-006). Worth it — the sectioned layout is too specific for a generic block.

## D-041 — IBE Product Suite landing renders the Webflow Tools Showcase embed
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** The Webflow `ibe-product-suite.html` page has a large self-contained HTML embed (~15 KB) showing the 6 (now 7) products as a tools showcase grid. Recreating this from scratch loses subtle details.
**Decision:**
- `/ibe-product-suite` becomes a hardcoded route with `component_key = 'ibe-tools-showcase'`
- The component is a React port of the original embed
- Product data comes from the new IBE sub-brand records (multicheck, cockpit, etc.)
- Each product card links to its sub-page (e.g. `/ibe-product-suite/multicheck`)

**Trade-offs:** Hardcoded component is a maintenance touchpoint. Mitigated — the layout rarely changes; only the product list does, and that's data-driven from `brands` table.

## D-042 — Page count is 52 (was 56)
**Date:** 2026-06-15
**Status:** Adopted. Supersedes D-023.
**Context:** Original spec included 4 standalone pages from the Webflow export (`/budget26`, `/ops`, `/image-grid`, `/focus-mgzn`) that have no recurring use.
**Decision:** Remove the 4 standalone pages entirely. Final page count is 52: 13 top-level + 39 sub-pages.
**Migration:** `0008_restructure_brands.sql` deletes them.
**Trade-offs:** Inbound links to these URLs break. Acceptable — these are unlinked internal scratch pages.
**Note (current: 55 as of 2026-06-22):** the live page count has since grown to 55
(12 top-level + 43 sub-pages) via the APIX group page (0016) and Presentation Hub
(0033), minus `/internal-branding/configurator` (D-056). The "52" above is the
point-in-time Phase 3.5 decision, not the current count — see ARCHITECTURE §4.

## D-043 — airLounge kept in DB, hidden from sidebar
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** airLounge is an existing IBE product but not active in the new sidebar. We don't want to delete it (legacy inbound links may exist) but it shouldn't clutter the sidebar.
**Decision:** Keep airLounge as the 7th IBE product sub-brand and as a sub-page. Set `pages.hidden_in_sidebar = true` on `/ibe-product-suite/airlounge`. URL remains reachable, but the sidebar doesn't render it.

## D-044 — Playground kept hidden until game ships
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** Playground is reserved for a future interactive game/experiment.
**Decision:** Keep `/playground` page. Set `pages.hidden_in_sidebar = true`. When the game ships, flip the flag.

## D-045 — Service Center renamed to Service Center Antalya, URL changes
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** Original brand was `service-center`. The actual operational name is "Service Center Antalya" — Antalya is the location.
**Decision:**
- Brand slug: `service-center` → `service-center-antalya`
- Brand name: `Service Center` → `Service Center Antalya`
- URLs: `/service-center` → `/service-center-antalya` (and all sub-pages)
**Migration:** `0008_restructure_brands.sql`.
**Trade-offs:** Inbound links to old `/service-center` URL break. We can add a Vercel rewrite rule if needed. Acceptable — the site isn't live yet.

## D-046 — Custom embeds preserved from Webflow export
**Date:** 2026-06-15
**Status:** Adopted.
**Context:** The Webflow site has hand-written interactive components (APIX Workflow, Global Network, Jersey Customizer, Signature Generator, Out-of-Office Generator) that don't fit any block type. Recreating from scratch risks visual/behavioral drift.
**Decision:** Extract the embeds verbatim from the Webflow export and preserve them in `spec/embeds/`. Phase 6 ports them to React 1:1 — same DOM, same classes, same animations, just wrapped in React components.

Full inventory: `EMBEDS_INVENTORY.md`.

**Trade-offs:** The CSS/JS isn't idiomatic React — needs refactoring for hooks and refs. Acceptable — the alternative (rebuild from screenshots) is worse.

## D-047 — Three-tier role model
**Date:** 2026-06-20
**Status:** Adopted.
**Context:** The old `profiles.role` set (`admin|editor|viewer`) couldn't express "structural/sensitive ops are stricter than day-to-day admin." File System v2 needs a tier above admin.
**Decision:** Roles are `super_admin | admin | user`. `is_admin()` is KEPT (same name/signature) and now means `role IN ('admin','super_admin')`, so every existing RLS policy keeps working unchanged. New `is_super_admin()` (same shape) gates structural ops (folder delete, visibility toggle, role management). `src/app/admin/layout.tsx` updated to allow both admin tiers.
**Migration:** `0030_role_model.sql`.

## D-048 — Data-driven role assignment
**Date:** 2026-06-20
**Status:** Adopted. Supersedes the single `app.initial_admin_email` mechanism (D-028).
**Context:** Roles should be editable as data, not hardcoded per environment.
**Decision:** `user_role_defaults(email → role)` (RLS: super-admin only) seeds intended roles; `handle_new_user()` applies them on signup, defaulting to `user`. Existing profiles are updated in place. The later user-settings UI just edits `profiles.role`. Seeded super-admins: bdemir@, eerkara@, utenekeci@, aoezbek@, **dev@** (the actual login). `INITIAL_ADMIN_EMAIL` in `.env.example` is deprecated.
**Migration:** `0030_role_model.sql` (+ dev@ in `0031`).

## D-049 — Folder tree, no separate category
**Date:** 2026-06-20
**Status:** Adopted.
**Context:** The flat `documents` library used a `category` + `department` taxonomy. A real file manager needs nesting.
**Decision:** `document_folders` is a recursive tree (`parent_id`, unlimited nesting). A file lives in exactly one folder (`document_files.folder_id`). Chips on a folder page are its direct child folders. No `category` concept.
**Migration:** `0031_document_library_filesystem.sql`.

## D-050 — Trigger-maintained folder path
**Date:** 2026-06-20
**Status:** Adopted.
**Context:** URL→folder resolution and breadcrumbs need to be cheap; moves must rewrite descendants.
**Decision:** `document_folders.path` is a materialized slash-joined slug path kept by a BEFORE trigger (with an in-trigger cycle check on move) and a set-based AFTER trigger that rewrites descendants on rename/move. A DB `slug` CHECK (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) keeps segments metacharacter-free so the path math is provably safe (closed a LIKE-metacharacter corruption surface found in adversarial review).
**Migration:** `0031`.

## D-051 — Per-folder is_public gates listing (FORCE RLS)
**Date:** 2026-06-20
**Status:** Adopted.
**Context:** NDA/contract sensitivity must decouple from the (later) login rollout.
**Decision:** `document_folders.is_public` (default false) gates listing via RLS; files are visible iff their folder is. RLS is ENABLEd **and FORCEd** on both tables (closes a SECURITY-DEFINER bypass). The later login gate is a one-clause change to the SELECT policy. Write policies are command-specific (INSERT/UPDATE/DELETE) so they never widen reads.
**Migration:** `0031`.

## D-052 — Private bucket + gated signed-URL serving
**Date:** 2026-06-20
**Status:** Adopted. **Supersedes the spec's "reuse the public documents bucket."**
**Context:** The `documents` bucket is public — `is_public` would only hide *listings* while files stayed at permanent public URLs (NDAs reachable by leaked link). The user chose true access control.
**Decision:** A new **private** `library` bucket (15 MB, extended MIME, admin-write, no public read). `document_files` stores only the object key (no `public_url`). Every fetch goes through `/api/library/file/[id]`: the request-scoped client fetches the row (RLS = the gate), then the service role mints a short-TTL signed URL (`Cache-Control: no-store`), inline for images/PDFs else download. Visibility toggle stays a pure metadata flip; login-gate-later is one clause in the route.

## D-053 — No data migration; fresh uploads
**Date:** 2026-06-20
**Status:** Adopted. **Supersedes the spec's metadata-only migration of the 47 documents.**
**Context:** The user will upload fresh into the new structure.
**Decision:** The library starts empty; no `documents`→folders migration. Old `documents`/`assets` rows are left intact (orphaned, available for rollback). Search + admin stats repoint to `document_files`; the legacy `getDocumentLibrary()` render path is deprecated (the new route shadows `/documents-library`). No file version history in v1 — `replaceFile` overwrites.

## D-054 — Multilingual variant model (language + group_id)
**Date:** 2026-06-20
**Status:** Adopted.
**Context:** The same logical document arrives over time in multiple languages (DE now, EN/TR later) and formats (PDF + Word). The old rigid `pair_id`/title-match was brittle.
**Decision:** `document_files.language` (CHECK `de|en|tr`, nullable; extend with a one-line ALTER) + `group_id` (anchorless uuid, no FK; NULL = standalone). The folder page groups by `COALESCE(group_id, id)` → one card per logical document with per-(language × format) downloads. Deliberately **no** `UNIQUE(group_id, language)` — a group legitimately holds same-language multiple formats.
**Migration:** `0031`.

## D-055 — Profiles role-escalation guard
**Date:** 2026-06-20
**Status:** Adopted.
**Context:** The adversarial review of the v2 server layer found that `profiles_update_admin` (0002) let any `admin` UPDATE any profile's `role` — self-promotion to `super_admin` via the REST API, defeating D-047's tier split.
**Decision:** Admins may still update profiles, but the `role` column may only change when the actor is `super_admin` (else the new role must equal the existing one — same MVCC subquery lock as `profiles_update_own`).
**Migration:** `0032_profiles_role_escalation_guard.sql`.

## D-056 — internal-branding/configurator removed instead of built
**Date:** 2026-06-22
**Status:** Adopted. Updates D-006 (drops the route from the hardcoded list) and closes out D-025 (Identity Configurator scope).
**Context:** The `/internal-branding/configurator` page carried `component_key` `identity-configurator`, but no backing component existed in `src/` — it only rendered the generic `HardcodedStub`. Not demo-relevant.
**Decision:** Remove the page rather than build the tool. `internal-branding` stays as Hero + applied-identity. The removal was a direct DB data change (`execute_sql`); a reproducibility migration is planned with the next `db push`.

## D-057 — Browser direct-to-Storage upload (signed URL), not through the Server Action
**Date:** 2026-06-22
**Status:** Adopted. **Supersedes the original "stream the file through the upload Server Action" upload path.**
**Context:** Library + Presentation Hub uploads streamed the file bytes THROUGH a Next.js Server Action (`uploadFile`/`uploadPresentation`). Next.js caps Server-Action request bodies at 1 MB by default (not raised in `next.config.ts`), and Vercel adds its own request-body cap — so any file over ~1 MB was rejected at the framework boundary. The client had no try/catch, so the rejected promise left the modal stuck on "Uploading…" with no error and no file. Production data showed all 8 uploaded files were < 1 MB (largest 0.955 MB) against a 15 MB ceiling.
**Decision:** Two-step upload. (1) An admin-gated Server Action mints a one-time **signed upload URL** (`createSignedUploadUrl`) — no bytes cross it. (2) The browser PUTs the bytes **straight to Storage** (`uploadToSignedUrl`), bypassing both the Next.js and Vercel body limits; the bucket's own `file_size_limit` (library 15 MB / presentations 25 MB) + `allowed_mime_types` still gate the PUT. (3) A second admin-gated action finalizes the DB row, reading the true size back via `.info()` (which also confirms the object landed) and rolling the object back on row failure. The upload modals wrap the whole flow in try/catch/finally so "Uploading…" always clears and errors always surface. App-layer only — no schema/migration change. `replaceFile`/`replacePresentation` keep the old through-action path for now (same root cause; out of scope for this fix).

---

## Anti-decisions (explicitly NOT doing)

- Not using Payload CMS in v1 (re-evaluate after Phase 5)
- Not splitting admin and frontend (D-002)
- Not building a separate API server
- Not real-time collaborative editing
- Not multi-tenant
- Not public API
- Not auto-translation
- Not keeping the 4 standalone pages (D-042)
- Not rebuilding Webflow embeds from scratch (D-046)

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

## D-058 — RAG Foundation Schema (airtuerk-KI)
**Date:** 2026-06-23
**Status:** Adopted. First decision of the RAG-airtuerk V2 build (airtuerk-KI internal RAG chat). Migration `20260623060259_rag_foundation`.
**Context:** Building a learnable, source-citing internal RAG over the existing Confluence snapshot (86 pages, 116 attachments), 15 brands, and a manually-seeded identity layer. Plan lives outside the repo (`OneDrive/terminal/01-FOUNDATION`).
**Decision:** 4-layer knowledge architecture as one additive migration: **Layer 1** `company_context` (hand-seeded identity; priority-1 rows always injected), **Layer 2** `confluence_chunks` (operations knowledge; vector + pg_trgm hybrid; `content_hash` includes source IDs for idempotent re-embed), **Layer 3** `brand_chunks` (structured brand knowledge), **Layer 4** `ai_corrections` (user corrections → admin-approved → become `confluence_chunks` with `source_type='correction'`), plus `ai_chat_sessions` + `ai_chat_messages` (retrieval logging). pgvector + HNSW on every embedding column, pg_trgm GIN on chunk content. RLS FORCED on all six: `SELECT TO authenticated` for reads, writes gated by `is_admin()`/`is_super_admin()`, chat rows scoped to owner (+ super_admin). Reuses the existing `public.set_updated_at()` (not recreated). Embedding stack, retrieval pattern, generation model, and email are separate decisions (D-059–D-065) as those stages land.

## D-059 — Embedding Stack + Hybrid Retrieval (Voyage + pg_trgm)
**Date:** 2026-06-24
**Status:** Adopted. Migrations `20260623060259` (embed-knowledge stack) + `20260623082750_rag_retrieval_function`.
**Context:** RAG retrieval needs both semantic recall and exact-keyword precision (PNR codes, brand names, Konti partner names) over the 424-chunk corpus.
**Decision:** Embeddings via **Voyage `voyage-4-large`** (1024-dim, `output_dtype=float`) generated in the `embed-knowledge` edge function (recursive 128-batch). Chunking: cascading boundary (paragraph→line→sentence) + char-window hard-split + bounded tail-overlap, capped ~800 tok (the source snapshot stores body_text as one newline-free line, so naive paragraph-splitting under-chunks — see BUILD_LOG). Retrieval via `public.rag_hybrid_search(query_embedding, query_text, match_count, trgm_count)`: priority-1 `company_context` always injected (score 1.0) + per-source vector arms (`<=>` cosine over HNSW) + a pg_trgm keyword arm on `confluence_chunks`, `DISTINCT ON (source, source_id)` dedup. `SECURITY INVOKER` + pinned `search_path=public`; `EXECUTE` granted to `authenticated`. Voyage reranking (rerank-2.5) + the priority-1-crowding cap happen in the `rag-query` function (D-060). Initial run: 424 chunks (page 134 / pdf 159 / office 60 / brand 43 / context 28), 0 errors, all ≤801 tok.

## D-060 — rag-query Generation (Claude Opus 4.8, identity-reserved rerank)
**Date:** 2026-06-24
**Status:** Adopted. Edge function `rag-query` (deployed, verify_jwt). Plan: 02-PIPELINE Atomic Prompt 2.3.
**Context:** Generation over the retrieved chunks must stream snappily, cite sources, and never let always-injected identity context crowd out operational answers.
**Decision:** Generate with **`claude-opus-4-8`**, streamed. **NO `temperature`, NO `thinking` field, NO `output_config.effort`** (Opus 4.7/4.8 reject sampling params with HTTP 400, and a `thinking` pause would fight the TTFB goal). `anthropic-version: 2023-06-01`. The SSE stream is passed to the client untouched while the server accumulates content + token usage (buffered, with an end-of-stream flush) and persists it to a **pre-inserted** `ai_chat_messages` row in a `finally` block (so partial streams are still saved). Cross-origin custom headers (`X-Session-Id`, `X-Message-Id`, `X-Weiss-Nicht`) are exposed via `Access-Control-Expose-Headers`.
**Identity-reserved rerank:** `rag_hybrid_search` injects all 20 priority-1 context rows at score 1.0; naively keeping them all would fill the 8-chunk budget and starve operational chunks. Instead: reserve ≤2 slots for `mission`/`brand_voice` (persona anchors), then Voyage **rerank-2.5** picks the remaining 6 from everything else. Candidates are sorted by `combined_score` **before** the rerank-input slice — `rag_hybrid_search`'s `DISTINCT ON` returns rows in `(source, source_id)` order, so without the sort the priority-1 context (incl. Geschäftsführung) fell past the 30-row input cap and the KI answered "nicht eindeutig" to "Wer ist der CEO?".
**Weiss-nicht handling:** priority-1 `company_context` entries are always injected via `rag_hybrid_search`, making `rawChunks.length===0` structurally unreachable in normal operation. Refusals are handled by Claude via system-prompt rule 7 ("Diese Frage liegt außerhalb meiner Wissensbasis") and rule 3 ("Das geht aus unseren Quellen nicht eindeutig hervor"). Both produce normal assistant messages with valid `messageId`, so the correction workflow (C14 goal) functions on them. `streamWeissNichtResponse` remains as a logged safety-net for theoretical edge cases (empty priority-1 table / DB corruption).
**Verified:** "Wer ist der CEO?" → "Ümit Tenekeci [Quelle: Kontext: Geschäftsführung]"; "Wetter auf dem Mars?" → rule-7 refusal; both persisted with tokens + latency; warm TTFB ~3s (watch in Atomic 2.5).

## D-061 — Curated Intelligence Knowledge Base as a RAG source
**Date:** 2026-06-24
**Status:** Adopted. Migrations `20260623093159_add_knowledge_base_source_type` + `20260623093507_seed_company_context_knowledge_base`. Demo-critical priority insert before File 03.
**Context:** A curated, partner-facing knowledge base (`airtuerk-intelligence-knowledge-base.md`, v1.2, authored by Business Development) closes content gaps the Confluence/brand corpus didn't cover: ~2.5M PAX/year, ~170 airline partners, the B2B product suite (Cockpit/multicheck/ATBeds), ATBeds lead (Tarık Öztürk) / airtuerk International (Burak Akpinar), and no-setup-fee onboarding.
**Decision:** Add `'knowledge_base'` to the `confluence_chunks.source_type` CHECK and embed the MD as a new source. The MD lives in the **`rag-knowledge` Storage bucket** (not hardcoded — the file contains backticks that would break a template literal, and Storage lets it be re-curated without a redeploy); the new `embedKnowledgeBase` handler downloads it, strips the HTML-comment header, splits on H2 headings (each section self-contained), and **drops the "Excluded / Review Items" meta-section** (it lists facts NOT to assert — conflicting revenue, unconfirmed staging URLs — which must never surface). Chunks go through the shared chunker (14 chunks from 8 sections, 148–692 tok). Plus **6 priority-1 `company_context` entries** for the highest-value facts (always-injected). `rag-query`'s citation label maps `source_type='knowledge_base'` → "airtuerk Intelligence: <section>".
**Verified:** "Wie viele PAX/Jahr?" → "2,5 Millionen PAX [Quellen: airtuerk Intelligence: Key Facts, …]"; ATBeds-Leitung → Tarık Öztürk / Istanbul; setup-fees → "keine Setup-Gebühren". KB + context blend in citations. TTFB 2–3.4s.

## D-062 — File 03 Frontend wire (turn-based RAG chat)
**Date:** 2026-06-24
**Status:** Adopted. Frontend Atomic 3.1–3.4 wired to the live pipeline (no push of 3.5–3.7 yet).
**Context:** The dashboard hero already had a turn-based chat (`SearchAIBox` → `AIChatWindow` → `AIAnswerBlock`, `AiTurn[]` persisted to localStorage) with a `FAKE_ANSWER` placeholder — not the inline single-answer shape the plan assumed.
**Decision:** New `src/lib/rag/client.ts` (`ragQueryStream` SSE client, `fetchMessageSources`, `submitMessageFeedback`, `submitCorrection`, `fetchPendingCorrectionsCount`, `ragToAiSource` mapper, `inferKonfidenz` + `isOutOfScope` heuristics). `AiTurn` extended (all optional, backwards-compat) with `messageId/isStreaming/weissNicht/feedback/error` + web-search skeleton (`webSearchTriggered/isWebSearch`). `SearchAIBox.submitAi` rewired to stream per-turn via functional `setTurns` (no closure-stale accumulation), `turnsRef` so `submitAi` isn't recreated per token (no re-render storm), conversation-level `sessionId`, deferred atomic finalize (text+sources+confidence land together — no flash-of-empty). `AIAnswerBlock` renders raw text while `isStreaming` (typewriter only for legacy/loaded turns), reuses existing source-card UI via the mapper (Korrektur badge for corrections), spinner until first token, error branch. **Verified live:** CEO answer + 8 cited sources; multi-turn "ihn"→Ümit resolution.

## D-063 — Persona v2 (airtuerk Intelligence)
**Date:** 2026-06-24
**Status:** Adopted. `rag-query` v6 + migration `20260623115541_persona_v2_context_entries`. Quality pass for the demo (IT-Chef stakeholder).
**Context:** Pre-persona the KI called itself "der airtuerk-Assistent", had no creator attribution, no phone-disclosure policy, and a weak out-of-scope refusal (mittel konfidenz + irrelevant sources).
**Decision:** System prompt rewritten — self-identifies as **"airtuerk Intelligence"** (first person, never "Assistent"/"Bot"); attributes creation to **Buhara Demir** on identity questions (exact phrasing); emits an **exact out-of-scope phrase** ending "Soll ich im Internet recherchieren?" (frontend detects it → disabled "Ja, im Web suchen" button, web-search lands in Workstream 4); strict **phone-policy** (business numbers only if in sources, private/mobile NEVER, GF Ümit via email/Office-Managerin Ayten Koc). Frontend `isOutOfScope()` hides the always-injected priority-1 sources + forces niedrig konfidenz on rule-7 refusals. 2 new priority-1 `company_context` entries (identity+creator, GF escalation). **Verified:** 7/7 (identity, self-ID, out-of-scope exact, business/private phone, GF escalation cited, CEO regression).

## D-064 — Brand pages render via typed TSX section components (off the DB-block aggregator)
**Date:** 2026-06-24
**Status:** Adopted. Code-only (no migration, no DB writes). Branch `brand-pages-new`.
**Context:** The 4 single-page brands (`airtuerk-service`, `airtuerk-holidays`, `atbeds`, `service-center-antalya`) rendered every section through the generic DB-block aggregator (`getBrandSectionsAll` → per-section `getBlocks` → `BlockRenderer`). Per-section markup was locked to the generic block components; the solo dev edits via prompt+push, not a CMS, so a CMS layer for these brand-section shells has no value (cf. D-006 hardcoded routes).
**Decision:** A guarded pre-branch in `page-view.tsx` dispatches only those 4 slugs (`BRAND_TSX_SLUGS`) to a new `<BrandPage>` orchestrator (`src/components/brand-sections/`). Each section is its own TSX file composing the existing presentational block components (logo_showcase, logo_grid, color_palette, document_list, asset_block, description) + the EmailSignature tool, with content hardcoded as typed props from the verified live `blocks.content`. DOM, anchor ids, CSS and client behaviour are byte-identical; brand pages drop ~6 per-section DB reads (only the parent page row + its hero block remain). The 2 universal colour palettes become constants (`brand-palette.ts`) — only 2 distinct `color_palette` values exist DB-wide. **Not changed:** the DB rows (blocks + brand-section child pages kept as backup), `getBrandSectionsAll` + the aggregator fallback (still serve `airtuerk-apix` + `internal-branding`), the sidebar, APIX, IBE. A later cleanup migration may retire the now-unused brand-section child rows + blocks.
**Verified:** typecheck + build green; all 4 pages SSR HTTP 200 with section-id order matching the DB child slugs (incl. Antalya's singular `logo`); two-col DOM + `<h2>` direct-child preserved; sidebar anchors resolve; `airtuerk-apix` + `internal-branding` fallback render unchanged.
**Follow-up 2026-06-25 (chore, no new D-number):** title-rename `14c0b86` applied on top; sidebar (DB `pages.title`) + in-page `<h2>` (TSX `brand-data`/`brand-page`) kept in sync per the D-064 architecture; Antalya angeglichen, anchor-slugs URL-stable.

## D-065 — Wissensbasis (`/admin/knowledge`) admin surface + corrections-first editing
**Date:** 2026-06-26
**Status:** Adopted. Merged to `main` `e7c5995`, deployed (Vercel READY). Migration `20260625190000_knowledge_base_foundation`.
**Context:** The RAG corpus (37 `company_context` + 363 `confluence_chunks` + 43 `brand_chunks`) had no human surface — chunks stayed invisible until they mis-rendered in a chat. The "Lernende KI" demo needs a place to see provenance, review user corrections, and watch quality. An advisor cross-check (vs live DB) corrected the original plan's memory-based numbers and one architectural assumption.
**Decision:** Super_admin page at `src/app/(public)/admin/knowledge/` (mirrors `/admin/users`: `(public)` group, `notFound()` gate; nav link in the user-menu). One page, four tabs — **Quellen / Reviews / Qualität / Taxonomie**. iOS-18 glass + Quantum-Blue, `.kb-` prefix, all KPIs computed live (never hardcoded). **Editing model = corrections-first (D-A):** only `company_context` is directly editable (its handler re-embeds the row in place → durable); `confluence`/`brand`/`knowledge_base` chunks are **regenerable caches** (`embed-knowledge` re-chunks from `confluence_raw`/blocks/MD via `upsert onConflict=content_hash`, so a direct chunk edit is clobbered on the next re-embed) and are therefore **read-only** — derived-content fixes flow through the Reviews loop. Reviewer gate = super_admin (prod has 0 admin accounts; Selin/Murat get email, not yet UI access).
**Verified:** typecheck+build green; renders against prod DB (KPIs 443/1-pending/92.9%/vor-2T, 4 tabs, 0 console errors); anon → 307 `/login`; "Abgerufen ×N" not "Zitiert" (B-3); grep confirms 0 hardcoded counts; `get_advisors(security)` 0 new findings.

## D-066 — Tag model: 5 axes, jsonb+GIN, vocabulary tables, Haiku classifier
**Date:** 2026-06-26
**Status:** Adopted. Migrations `20260625190000` (tables) + `20260626090000_seed_tag_vocabulary` (43-term seed). Edge fn `tag-classify-chunks` v1.
**Context:** The corpus needed faceted organisation (which brand/airline/topic a chunk concerns) for the admin filter view — without polluting retrieval.
**Decision:** Five tag axes — **topic / airline / department / provider / brand**. Assignments live as a `tags jsonb` column (+GIN) on `company_context` (the editable layer; held off confluence/brand pending source-side tagging — idea-4, post-V1). Vocabulary is a DB table `tag_vocabulary` (D-B, single source of truth, Tab-4 CRUD), with AI proposals routed to `tag_suggestions` for super_admin review (never auto-added). `tag-classify-chunks` (Claude **Haiku 4.5**) classifies only into the approved vocabulary (hallucination-guarded — invalid values dropped, genuinely-new ones → suggestions). **Tags do NOT affect retrieval** (admin-view organisation only). RLS via `is_super_admin()`; service-role writes bypass.
**Verified:** initial run 37/37 company_context tagged, 27 suggestions, 0 errors; sample quality sound (e.g. "Antwort-Tonalität" → brands:[airtuerk-service], topics:[support,faq], departments:[service]).

## D-067 — Correction review loop: approve → embed-knowledge('corrections'), Resend notify
**Date:** 2026-06-26
**Status:** Adopted. `src/lib/knowledge/actions.ts`, `reviews-tab.tsx`, `review-notifier.tsx`; edge fn `notify-correction-event` v2.
**Context:** The submission side (`AnswerFeedback` "Korrigieren" + `CorrectionModal` → `submitCorrection`) already existed; the review/approve half did not.
**Decision:** Reviews tab: pending inbox (diff old-vs-proposed side-by-side) with **Übernehmen / Bearbeiten & übernehmen / Ablehnen**. Approve = set `ai_corrections.status` + `final_content` + reviewer fields, then invoke `embed-knowledge('corrections')` — **never a manual chunk insert (K-6)**; the edge fn materialises the durable `confluence_chunks` row (`source_type='correction'`) and writes back `applied_to_chunk_id` (idempotent via `applied_to_chunk_id IS NULL`; double-approve guarded by `.eq('status','pending')`). Notifications: in-app `ReviewNotifier` pill+toast (super_admin, 45s poll of pending count) + transactional Resend emails via `notify-correction-event` (submitted → Selin+Murat; approved/edited/rejected → submitter; sender `terminal@airtuerk.online`; best-effort, never blocks the loop). A submit-confirmation toast was added to `CorrectionModal`.
**Verified (live dry-run, throwaway data, then deleted):** approve → new chunk 609 (embedding present) → `rag-query` on the exact question retrieved it at **rank 3/8, rerank 0.957**, answer contained "7.7%" with `[Quelle: Korrektur]` citation — **no retrieval boost needed**. Real email send confirmed (HTTP 200, Resend id `614de2ba-eaed-4c9e-9a6c-2508a569a7ab`). Demo state restored: 1 pending (Pegasus) + 0 correction-chunks.

## D-068 — Retrieval-stats rollup, content-shape heuristic, audit trail
**Date:** 2026-06-26
**Status:** Adopted. Migrations `20260625190000` (`chunk_edit_log`) + `20260626093000_chunk_retrieval_stats_job` (`pg_cron`).
**Context:** The page needed honest provenance ("how often is this chunk used?") and a change history, without storing drift-prone derived columns.
**Decision:** (1) **`chunk_retrieval_stats`** — a nightly (`pg_cron` 03:15) full-refresh rollup exploding `ai_chat_messages.retrieved_chunks` into per-chunk counts keyed by the namespaced `(source, source_id)`; surfaced as **"Abgerufen ×N"** (retrieval, not citation — B-3). Function is `SECURITY DEFINER` with `EXECUTE` revoked from anon/authenticated. (2) **Content-shape** (quote/table/bullets/prose) is a render-time heuristic (`shape.ts`), **no stored column** to drift (idea-3). (3) **`chunk_edit_log`** audit trail (reason + before/after diff + correction link), shown in a right-slide audit drawer. (4) Corpus unified at the query layer (`listChunks`), not a DB view (idea-2 honoured at the function boundary).
**Verified:** initial rollup populated 150 rows (context 37 / confluence 101 / brand 12, max ×100); cron job active; 0 new security advisors (REVOKE held; pg_cron in `cron` schema).

---

## D-069 — airtuerk-KI: live team-directory via tool-call (not embeddings)
**Date:** 2026-06-26
**Status:** Adopted. No migration (edge-function-only: `rag-query` v10).
**Context:** The KI only knew people who happened to appear in the embedded corpus (`company_context`/`confluence_chunks`/`brand_chunks`) — 60 of 63 `team_members` were invisible (e.g. Selin Köroglu had 0 corpus hits) — while `team_members` is already the single source of truth for `/team` (`getTeamMembers`) + `/admin/users` (`getAllTeamMembers`). `rag_hybrid_search` never touched it and the Claude call carried no `tools`.
**Decision:** Give `rag-query` an Anthropic tool **`query_team_directory`** (`search`/`department`, both optional) that reads `team_members` LIVE via the service-role client. Chosen over context-injection (W) and a re-embedded `team_directory` layer (Y) because the roster changes often (no re-embedding) and aggregate queries ("wer ist im Vertrieb?", "wer leitet HR?") retrieve poorly from embeddings. The executor returns only `first/last/position/department/email/is_lead` — **never** `phone`/`date_of_birth` (privacy is structural, policy 9d). `streamClaudeResponse` became a tool-use loop (cap 3 rounds) with in-stream SSE interception: only text deltas + one final `message_stop` are re-emitted (the client `rag/client.ts` fires `done` on the first `message_stop`, so raw passthrough is impossible). `search` is tokenized (AND-of-per-token-ORs) so a full name resolves in one call. Tool calls are logged into `ai_chat_messages.retrieved_chunks` as a `team_directory` entry.
**Verified:** prod `rag-query` v10; person-not-in-corpus, dept-aggregate (16 Service), privacy-refusal, ops-regression (no tool call), and edit→reflection (admin edit to `team_members` seen instantly + treated as authoritative over the stale corpus) all pass; edge logs 200, no errors.

---

## D-070 — Welle D3: priority-1 audit fixes (Pegasus/Hara Filo) + rerank-input headroom
**Date:** 2026-06-26
**Status:** Adopted. Migration `20260626093731_welle_d3_pegasus_harafilo_context` + edge fn `rag-query` v11.
**Context:** Two demo-visible gold-set answers were wrong — AUDIT-004 Pegasus Online-Check-in ("ab 7 Std" vs correct "72 Std") and AUDIT-003 Hara Filo Verlängerung ("selber Preis" vs correct "telefonisch, Euro-Preis + 20 % Servicegebühr"). Investigating surfaced the real constraint: `rag_hybrid_search` returns ALL active priority-1 `company_context` rows at a flat `combined_score = 1.0`, and `rerankWithIdentity` slices candidates to `RERANK_INPUT_LIMIT` by score — so with 29 priority-1 rows only ~3 operational confluence chunks reached the Voyage rerank input (the D-060 comment assumed ≤20). This crowding plausibly caused the Pegasus miss (its correct chunk squeezed out) and would worsen with each new priority-1 row.
**Decision:** (1) Raise `RERANK_INPUT_LIMIT` 30→40 in `rag-query` (v11) so ~11 operational slots survive alongside the priority-1 rows; Voyage still returns the best `FINAL_CHUNK_LIMIT` after rerank. (2) Add two `priority=1`, category `process` `company_context` rows: Pegasus check-in (anchors "72 Std" — belt-and-suspenders given Pegasus's 2-chunk sparsity) and Hara Filo Verlängerung (states the correct value AND explicitly overrules the stale TR source "ayni fiyat üzerinden", since the wrong Confluence chunk stays retrievable — a re-embed cannot fix a wrong source). Both rows retrieve immediately via the priority arm (embedding-independent); embeddings backfill later via `embed-knowledge {context}` (ZDR-gated), not part of this change. The Confluence Hara Filo source edit remains a Buhara/Murat human track. `process` is not an identity category, so the rows enter the reranked fact pool (not the always-on identity block).
**Verified (live, prod):** "Pegasus Online-Check-in-Fenster?" → "ab 72 Stunden bis 60 Minuten … '7 Std.' ist falsch" + operational Involatus steps cited; "Hara Filo Verlängerung?" → "telefonisch, Euro-Preis + 20 % Servicegebühr … ältere Quelle überholt" + Confluence Hara Filo details; no-regression "ETI No-Show?" → "ab 14 Tage" [Confluence: ETI Konti]. Operational confluence chunks now coexist with priority-1 context in every answer (limit-40 confirmed). company_context 37→39, priority-1 29→31; 0 console errors.
---

## D-071 — Invite→onboarding→self-profile + super-admin chat audit
**Date:** 2026-06-26
**Status:** Adopted. Migration `20260626140000_self_service_profile_fields` **applied to prod 2026-06-26** (additive — live site unaffected, old `getTeamMembers` query is column-compatible); code merged to `main`. **Pending go-live:** swap Invite+Recovery email templates (`spec/AUTH_EMAIL_TEMPLATES.md`) after deploy.
**Context:** The invite flow was structurally incomplete: `inviteUser` → `inviteUserByEmail` sent a Supabase link, but there was **no `/auth/confirm` route** to turn the click into a session (the PKCE `token_hash` flow was unhandled), invited users got **no `force_password_change`**, and `/account/profile` was a stub. Forgot-password was a placeholder. Profile data lives on `team_members`, but only `phone`/`date_of_birth`/`show_birthday` were self-editable — no social/status/bio fields and no self-avatar. Super-admins could not see a user's AI-chat questions, though the `ai_chat_*` RLS already grants `is_super_admin()` cross-user read.
**Decision:**
1. **Auth landing (`/auth/confirm`):** a route handler outside `(public)` runs `verifyOtp({token_hash,type})` (with a `?code=`→`exchangeCodeForSession` fallback), then routes invite→`/login/update-password?type=welcome`, recovery→`?type=recovery`. The Invite + Recovery **email templates** switch to a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` link (see `spec/AUTH_EMAIL_TEMPLATES.md`; apply at go-live, AFTER the route deploys). `inviteUser` sets `app_metadata.force_password_change=true` (backstop to the explicit redirect) and seeds `full_name` into user_metadata. No `redirectTo` is passed — the template owns the link host via GoTrue's own SiteURL, avoiding a stale `NEXT_PUBLIC_SITE_URL`. Real forgot-password via `resetPasswordForEmail`.
2. **Self-service profile:** 9 new `team_members` columns (`status_line` ≤50 CHECK, `about`, `location`, `company`, `website`, `github`, `linkedin`, `instagram`, `private_phone`); reuse existing `date_of_birth`/`phone`/`show_birthday`. `updateOwnProfile` whitelist widened; new `getOwnProfile`, `updateOwnAvatar` (session-scoped, service-role storage), `ensureOwnTeamMember` (auto-provision the one unlinked account, dev@). New `/account/profile` form: Name/Role/**Login-Email read-only** (email change is auth-level, structurally excluded from the whitelist). "Profil" user-menu link un-stubbed.
3. **Directory read tightened:** `team_select_public` (anon) → `team_select_authenticated`. The app is fully login-gated, `/team` reads via the cookie-bound server client, the AI tool reads via service-role — so anon can no longer read `private_phone`/DoB at the DB layer.
4. **`/team` detail:** public-safe projection added to `getTeamMembers` (no `private_phone`; DoB only when `show_birthday`); member cards open a detail modal.
5. **Super-admin AI-chat audit:** `getUserChatHistory` (RLS read, super_admin via the existing policy — **no migration**) + `loadUserChat` (`requireSuperAdmin`, logs `view_user_chat` for a DSGVO audit trail) + a "KI-Chat" tab in the user-detail modal. Super_admin-only at both the action and RLS layers; admins can never reach it.
**Verified:** `pnpm typecheck` + `next build` green. End-to-end (local dev vs migrated prod DB): `/team` 63 cards + detail modal; profile form load + Login-Email read-only + save persists (RLS self-write, status_line+instagram confirmed in DB then rolled back); super-admin KI-Chat tab (Buhara 23 sessions/69 answers + `view_user_chat` audit row); `/auth/confirm` no-token→307 `/login?error`. Invite email round-trip pending the template swap + deploy.

---

## D-072 — KI Mode-Chips + per-chip semantic glow (scoped exception to D-036)
**Date:** 2026-06-26
**Status:** Adopted on `feat/mode-chips-hero` (awaiting local review + merge). Frontend is backward-compatible with the live `rag-query` **v11** (which ignores the new `mode` field); the **modes only become functional after the `rag-query` v12 deploy** (gated on explicit sign-off — edge-function deploys are instantly global, no preview isolation).
**Context:** The dashboard AI box answered every query through the full RAG pipeline. A high-demo-value, low-cost win for the 2026-08-01 story is letting a user paste raw text and have the KI transform it (polish a customer mail, translate, summarize, draft a de-escalation reply) — a "mode" overrides only the final LLM system prompt, leaving Voyage embeddings + the 410-chunk corpus untouched. The 4 example quick-chips below the box (`Was ist ein Zip-Mandat?` …) were placeholders and are dropped in favour of the mode-chips.
**Decision:**
1. **Mode-chips above the box:** a new `ChatMode` (`default | rewrite-mail | translate | summarize | escalation`) + `MODE_CHIPS` config (`hero-data.ts`); `<ModeChips>` renders 4 toggles above `.ai-search-box`. Arming a chip implies KI mode, swaps the textarea placeholder, and is **consumed per-send** (disarms back to `default` so chat-window follow-ups stay normal RAG). The old `<QuickChips>` + `QUICK_CHIPS` are removed.
2. **Per-chip semantic glow — SCOPED EXCEPTION to D-036.** D-036 keeps `--accent` (Quantum Blue) as the *only* UI-chrome accent and bars green as a success colour. Here each chip + the armed box's glow carries a semantic colour: Mail polieren = green (`--success`), Übersetzen = blue (`--accent`), Kurzfassen = amber (`--warning`), Eskalation = red (`#dc2626`). These colours are **confined to the mode-chips and the box's armed glow ring** (`--glow-*` custom props); the accent stays Quantum-Blue everywhere else, so D-036 holds for the rest of the system. Approved by Buhara for demo differentiation.
3. **`mode` threading (backward-compatible):** added to `RagQueryOptions`/`ragQueryStream` body (`rag/client.ts`) and `AiTurn` (`search/types.ts`). The browser still calls the edge fn directly (no Next API route).
4. **Per-mode RAG bypass (variant C):** in `rag-query`, `rewrite-mail`/`translate`/`summarize` skip embed + `rag_hybrid_search` + rerank + the `query_team_directory` tool and run a focused system prompt (`buildModeSystemPrompt`, `allowTools:false`) — they operate on the user's pasted text, no corpus needed. `escalation` keeps the full pipeline + team tool and appends `ESCALATION_SUFFIX`. `default` is unchanged. Session + user-message logging still run for every mode (`ensureSessionAndLog`), so answers stay correctable. Language is implicit (the prompts say detect-input-language-and-answer-in-it; Opus 4.8 handles DE/EN/TR) — no UI toggle.
5. **Hero rebreathe:** `.dh-greeting` row→centred column (orbit-seal on top, greeting below, `-24px` pull dropped); `.dh-page` top padding `--space-6`→`--space-12` and gap `--space-8`→`--space-10`, plus `--space-8` extra below the box, so the composer sits nearer the vertical middle with more air before `.qg-section`.
**Verified:** `pnpm typecheck` + `next build` green. Browser (worktree dev, authed): greeting renders as a centred column, the 4 mode-chips render with the correct colour classes, the example chips are gone — layout confirmed. Interactive arm-glow not exercised in the worktree preview (a nested-worktree hydration artifact that also leaves the pre-existing KI pill inert) → confirm in main-repo local dev. Edge-fn v12 deploy + live mode behaviour pending sign-off.

---

## D-073 — Platform UI → English (chrome only) + AI answers in input language + remove gold-set quiz
**Date:** 2026-06-26
**Status:** Adopted + fully shipped 2026-06-26: merged to `main` (FF over Emirkan's `74450e3`), Vercel deployed (live English UI confirmed), `rag-query` **v12 deployed**, migration `20260626160000` **applied** (4 `/gold-set*` pages removed → 51 pages; 84 `gold_set_answers` rows kept).
**Context:** The platform mixed German + English UI. Buhara: make the whole UI English now, real translations later; the AI must answer in the user's own language (TR question → TR answer), not forced German; brand copy + generated content stay German. Separately, the Gold-Set validation quiz (3 review pages + index) had finished collecting data and is no longer needed.
**Decision:**
1. **UI chrome → English** across app routes, auth/login, admin (users + knowledge), documents, shell, `/team`, and dashboard. Done via a multi-agent sweep (translate → adversarial verify) that touched only user-facing chrome and left logic strings, enum/union VALUES, route params, role/status discriminants, CSS classes, comments, and brand/content German. **Content stays in its language:** out-of-office & email-signature templates, AI demo data, brand copy, language endonyms (`Türkçe`).
2. **AI input-language answers:** `rag-query` rule 4 changed from "always German" to "answer in the question's language (DE/EN/TR)"; the two frontend-detected protocol phrases (out-of-scope + identity, rules 7+8) stay exact German so detection still fires. Active on the v12 deploy.
3. **Dashboard greeting:** `"Alright {name}, what are we fixing today?"` (fallback `there`).
4. **Remove the Gold-Set quiz:** deleted `review-quiz`/`gold-set`/`ai-test-data` components + `gold-set.css` + `page-view` routing; migration `20260626160000` deletes the 4 `/gold-set*` pages rows at deploy. The **84 `gold_set_answers` rows + the knowledge-admin Gold-Set stats are kept** ("we just needed the data").
**Verified:** `tsc --noEmit` green; `/login` + dashboard confirmed English live (worktree dev). `next build` not run in-worktree (a `/account/profile` prerender quirk fails identically on plain `origin/main` there); the main-repo build is authoritative. i18n is hardcoded-English — a real translation layer is future work.

---

## D-074 — Document Library: persistent, shared folder colour
**Date:** 2026-06-26
**Status:** Adopted. Migration `20260626170000_document_folders_color` (additive `color text`, nullable, CHECK in grey/blue/green/yellow). Applied to prod via SQL editor (gated; sign-off given).
**Context:** Folder colour variants (grey/blue/green/yellow) were client-only (`localStorage`) — lost on reload/device change, a marked transition awaiting a DB column.
**Decision:** Colour becomes a **shared folder property** (everyone sees it; only admins change it via `setFolderColor`, same gate as rename/move), replacing the per-device localStorage. The colour **VALUES live in CSS** (`document-library.css` → `.dl-folder-fx[data-color]` gradients + `--folder-swatch-*`); the DB + the `FOLDER_COLORS` enum (`documents-constants.ts`) only store the identifier. Add a colour = extend the CHECK + the enum + one CSS block. NULL = default grey.
**Verified:** `tsc` + `next build` green; live preview — set blue → full reload → persisted from DB → reset grey.

---

## D-075 — Document Library: rename redirects to new slug + non-empty-folder delete guard
**Date:** 2026-06-26
**Status:** Adopted (code-only, no migration).
**Context:** Renaming a folder on its own page changed the slug → the path trigger rewrote `path`, but the page did `router.refresh()` on the now-stale URL → **404**. Separately, `deleteFolder` was a recursive cascade that silently removed files + subfolders.
**Decision:**
1. `renameFolder` returns the new `path`; the folder page `router.replace`s to `/documents-library/<newPath>` when it changed (else refresh) — no more 404.
2. `deleteFolder` **refuses** when the subtree contains ANY file rows (live or trashed — they'd be orphaned), with *"This folder isn't empty. Delete the files inside it first."* (toast on cards/rows, inline in the on-page menu). Column-independent count.
**Verified:** live preview — rename followed to new slug (200, no 404), then restored; delete-guard copy confirmed.

---

## D-076 — Document Library: file Trash (soft-delete, 30-day retention)
**Date:** 2026-06-26
**Status:** Adopted. Migration `20260626180000_document_files_trash` (additive `deleted_at`/`deleted_by` + partial indexes + `purge_expired_trashed_documents()` SECURITY DEFINER + daily `pg_cron` job). Applied to prod via SQL editor (gated; sign-off given, cron jobid 2).
**Context:** Deleting a file was an immediate hard delete (row + blob, no recovery).
**Decision:** `deleteFile` is now **soft** — sets `deleted_at`; the file leaves every normal listing/count but survives **30 days**, restorable. New admin actions: **Restore**, **Delete forever** (real row+blob removal), **Empty trash**. A reserved admin-only route `/documents-library/trash` (shadows folder resolution so a folder can't be named `trash`) renders the Trash view (origin folder, "N days left", actions); the **Trash entry is pinned at the bottom of the Documents secondary sidebar**. A daily `pg_cron` job purges items >30 days (row + `storage.objects`). All file reads filter `deleted_at IS NULL`. **Rollout guard:** the data layer probes for the columns each request, so the library renders + deletes degrade gracefully before the migration lands (same pattern as D-074).
**Verified:** `tsc` + `next build` green; columns confirmed live; Trash view + bottom-pinned sidebar entry render; rollout guards held pre-migration. (Soft-delete→restore UI round-trip not auto-driven — the Preview harness can't dispatch the right-click menu — but the write path is identical to the D-074 colour write, verified live.)
**Related:** the same construct (tree, colour, trash, full-height secondary sidebar) is queued to port to `/presentation-hub` (its own parallel stack: `presentations.ts`, `presentation_*` tables).

---

## D-077 — Presentation Hub: ported the Document Library construct 1:1
**Date:** 2026-06-26
**Status:** Adopted. Migration `20260626190000_presentation_folders_color` (additive `color`). Applied to prod via SQL editor (sign-off given).
**Context:** The Presentation Hub was a parallel stack (own `presentations.ts`, `presentation_*` tables, `presentation-*` components) with a Quantum-tinted CSS-3D folder card, **no folder colour, no card management, and no secondary sidebar**. Buhara: make it 1:1 with the now-shipped Document Library construct (D-074/075/076).
**Decision:** Port the whole construct into the presentation namespace, wired to the presentation actions/data:
1. **Folder colour** (shared, admin-write) — `presentation_folders.color`, reusing the `FolderColor` enum + the CSS `.dl-folder-fx` palette.
2. **Nested open-path sidebar tree** (`getPresentationFolderTreeForPath`) in a NEW secondary sidebar (`presentations-sidebar.tsx`) — restructured the page from centered `.main-inner` to the shared `dl-shell` layout. Bottom-pinned **Trash** (see D-078).
3. **Folder card** = the documents SVG folder card (`PresentationFolderCard3D`) with the full context menu (Open / colour / Rename / New subfolder / Move… / Delete), dropping the Quantum tint. The shared `FolderGraphic3D` gained an optional `previewSrc` prop so peeks point at the presentation thumbnail route.
4. **Subfolder counts + preview** (`getChildPresentationFoldersWithPreview`), **standalone Move** modal, **rename → new-slug redirect**, **non-empty-folder delete guard**.
5. **Shell:** `/presentation-hub` added to `LIBRARY_ROUTE_PREFIXES` + the pre-paint script → auto-collapse + full-height sidebar. The global library nav node is kept VISIBLE on its own route (as a plain link, sub-list dropped) so it never disappears (applied to Documents too). Sidebar Resources order: **Presentations → Documents → Assets → Team**.
   The presentation FILE display (thumbnails / slides / player) stays presentation-specific — only the FOLDER construct is shared.
**Verified:** `tsc` + `next build` green; live preview — sidebar tree, managed colour cards (colour persists from DB), counts, Trash route, Move/Rename menus, both nav nodes visible, pill toolbar buttons in subfolders.

---

## D-078 — Presentation Hub: file Trash (soft-delete, 30-day retention)
**Date:** 2026-06-26
**Status:** Adopted. Migration `20260626200000_presentation_files_trash` (additive `deleted_at`/`deleted_by` + partial indexes + `purge_expired_trashed_presentations()` + daily `pg_cron`). Applied to prod via SQL editor (sign-off given).
**Context:** Mirrors D-076 for the hub. `deletePresentation` was an immediate hard delete (row + all blobs).
**Decision:** `deletePresentation` is now **soft** (sets `deleted_at`); all live listings filter `deleted_at IS NULL` (on top of the existing `NOT is_archived` version filter). Admin actions: **Restore**, **Delete forever**, **Empty trash**. Reserved admin-only `/presentation-hub/trash` route + Trash view + bottom-of-sidebar entry. The daily `pg_cron` purge removes **every** object a presentation owns — `storage_path` + `thumbnail_path` + each path in `slide_paths[]` (richer than the doc library's single object). Rollout-guarded reads (probe each request) so the hub renders pre-migration.
**Verified:** `tsc` + `next build` green; columns confirmed live; Trash route + bottom-pinned sidebar entry render.

---

## D-079 — Presentation Hub: folder visibility (public/private)
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260626210000_presentation_folder_visibility` (additive `is_public`, default TRUE, + RLS). Applied to prod via SQL editor (sign-off given).
**Context:** Documents support "make folder private", but the Presentation Hub was built login-only with **no `is_public` column** and RLS `USING (true)` — so the toggle had nothing to act on (the port couldn't expose it). Buhara: presentations should be able to make a folder private like Documents.
**Decision:** Add `presentation_folders.is_public` (D-052 model). The hub stays login-only, so **private = admin-only** (vs visible to every authenticated user). RLS: `presentation_folders_select` → `is_public OR is_admin()`; `presentation_files_select` → the file's folder is public OR admin — so a private folder hides its presentations from non-admins too (the signed-URL serving route mints only AFTER this RLS-gated read). New action `setFolderVisibility` (super-admin); **"Make private / Make public"** in the folder card menu + the on-page folder menu; the lock cue on private cards reuses the shared `FolderGraphic3D`. Reads rollout-guarded (probe `is_public`).
**Default = TRUE** (non-breaking: existing + new folders stay visible; admins opt specific ones private) — deliberately differs from `document_folders` (default private) since the hub was previously all-visible.
**Verified:** `tsc` + `next build` green; live preview — Make private → lock cue → persists from DB → Make public → lock gone; column + RLS confirmed live.
**Folder parity (same change):** a recon sweep vs the Document Library closed the last folder-UI gaps — added the **visibility status pill** (`PresentationVisibilityPopover`, 1:1 with the doc one) + static Private pill on the folder page; added the **empty-space right-click menu** (New subfolder / Upload / Refresh); restyled the New-folder dialog + the on-page ⋮ menu to `dl-` and reduced the menu to **Move + Delete** (Rename → title pencil, visibility → pill, New subfolder → toolbar/space-menu, matching docs). By-design divergences kept: presentation file cards in their own grid; file dialogs stay presentation-specific.

---

## D-080 — Per-user folder permissions (Document Library + Presentation Hub)
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260627090000_folder_permissions` (two grant tables + SECURITY DEFINER helpers + widened SELECT policies).
**Context:** Folders were binary — `is_public` (everyone) vs private (`is_admin()` only, D-051/D-079). Buhara: a super_admin must be able to grant **individual people** read access to a private folder in either library, with the grantee able to open/download but change nothing.
**Decision:** Two parallel grant tables `document_folder_permissions` / `presentation_folder_permissions` `(folder_id, team_member_id, granted_by)`. Grants key off **team_members** (the 63-person directory), NOT `auth.users` — most people have no account yet, and a grant must persist + auto-activate on first login (resolved via `current_team_member_id()` → `profiles.team_member_id` ∥ `team_members.auth_user_id`).
  - **Access model:** a grant on folder G gives CONTENT access to G **and every descendant** (downward inheritance), and to nothing above G — a subfolder grant never leaks the parent's content. The grantee can **see the tree** along the path to a grant (ancestors render for navigation) but those ancestors expose **no content**. Helpers: `can_access_*` (self/ancestor grant → files) vs `can_see_*` (self/ancestor/descendant grant → folder appears in the tree). Path math is LIKE-safe (slug CHECK ⇒ no metacharacters).
  - **Read-only:** the folder/file **write** policies stay `is_admin()`-only; grants only widen SELECT. Grantees can't rename/move/delete/upload.
  - **RLS safety:** the helpers are `SECURITY DEFINER` owned by `postgres` (which has `BYPASSRLS`), so a folder's own SELECT policy can call them without recursing through `FORCE ROW LEVEL SECURITY` — the same mechanism `is_admin()` already uses (verified against the live DB).
  - **Enforcement is pure RLS** ⇒ the signed-URL serving routes (`/api/library/file/[id]`, `/api/presentations/file/[id]`) need **no change** (they gate by reading the row with the RLS client, then sign with the service role).
  - **UX:** a super_admin-only **"Manage access…"** item in all four folder menus (both cards' right-click menu + both on-page ⋮ menus) opens a shared `ManagePermissionsModal` — the full team directory (avatar · name) with a search box, multi-select toggles. Saving diffs the selection (grant/revoke), audit-logs (`folder_access_changed`), and **emails each newly-added person** (fire-and-forget edge function `notify-folder-access`, Resend) with a deep link to the folder.
**Verified:** `tsc` + `next build` green; migration DDL + the access path-math behaviourally proven in a rolled-back transaction against the live schema (ancestor = tree-only, granted+descendants = full, sibling = hidden).

---

## D-081 — Reconcile schema_migrations ledger drift
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260627100000_drift_repair_register_missing_migrations` (registry-only backfill) + 34 file renames. Schema-side NoOp.
**Context:** The 2026-06-27 Phase-B health check (`spec/HEALTH_CHECK_2026-06-27.md`) found `supabase/migrations/` out of parity with the live `supabase_migrations.schema_migrations` registry in three ways: (1) **5 migrations** (D-074/076/077/078/079 schema parts — document/presentation folder colour, file Trash, presentation visibility) were applied via `execute_sql` to prod but never recorded — live schema correct, registry empty; (2) **30 legacy `00NN_*.sql`** files were registered under timestamp versions (CLI-converted at first apply), so `supabase migration list` showed false pending/remote-only; (3) **4 timestamp-mismatched** files (repo picked a round timestamp, the ledger kept the real apply-time): `knowledge_base_foundation` (190000→200810), `seed_tag_vocabulary` (090000→040925), `chunk_retrieval_stats_job` (093000→041454), `self_service_profile_fields` (140000→110208). Only kb_foundation was in the original reconcile plan; the other 3 were surfaced by an md5 of the sorted version set.
**Decision:**
  - (1) backfill the 5 versions into `schema_migrations` (`created_by='drift-repair-2026-06-27'`) via `execute_sql` plus an explicit self-registration row for `20260627100000` — **not** `apply_migration`, which would auto-assign a now-timestamp and re-introduce a 1-file drift. The migration file body stays at the 5 backfill rows so the CLI runner records `20260627100000` itself on a fresh `db reset` (no duplicate-key conflict).
  - (2)+(3) rename all 34 files to their registered `<timestamp>_<name>.sql`. Two keep their numeric prefix in the registered `name` (`0017`, `0033`) → double-prefixed filenames.
**Result:** repo files 74→75, ledger 69→75; md5 of the sorted version set is identical on both sides (`8b62c4b2…`); `comm` empty both ways. Schema unchanged.
**Future guardrail (strengthens D-056):** every `execute_sql` **DDL** change must ship a companion migration **in the same commit**, registered through the migration system (`apply_migration`/`db push`), so file↔ledger parity holds. Recorded in `CLAUDE.md`.
**Reversibility:** `DELETE FROM supabase_migrations.schema_migrations WHERE created_by='drift-repair-2026-06-27'` + `git revert` the rename commit. Schema-side: nothing to roll back.
**Verified:** Phase A pre-verify (5 unregistered = 0 rows; 8 schema markers true; 30 ledger names matched; kb version confirmed) + Phase C post-verify (6 rows inserted, total = 75, version-set hash parity).

---

## D-082 — Phase-B hardening: drop gold_set open-INSERT + privatize documents bucket
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260627110000_harden_gold_set_and_documents_bucket` (applied + registered).
**Context:** Two zero-risk findings from the 2026-06-27 health check (`spec/HEALTH_CHECK_2026-06-27.md`): (1) `gold_set_answers` kept an open-INSERT RLS policy (`WITH CHECK (true)` for anon+authenticated) after the quiz UI was removed (`20260626160000`) — a spam vector with no caller; (2) the `documents` storage bucket was `public=true` with 0 objects (the Document Library uses the private `library` bucket) — a latent world-read.
**Decision:** drop `gold_set_answers_insert_public` (the SELECT policy `gold_set_answers_select_auth` stays, so admin reads are unaffected) and set `documents` bucket `public=false`. Applied via `execute_sql` + an explicit `schema_migrations` row at version `20260627110000` (pinned after the D-081 reconcile; `apply_migration` would auto-stamp ~06:50 and mis-order it before 09:00).
**Result:** ledger 75→76; repo↔registry version-set hash parity preserved.
**Reversibility:** re-`CREATE POLICY` / set the bucket `public=true` again (both noted in the migration header).
**Verified:** post-apply — insert policy gone, select policy kept, `documents.public=false`, ledger=76, version-set hash parity.

---

## D-083 — FK covering indexes (26)
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260627120000_fk_covering_indexes` (applied + registered).
**Context:** The performance advisor flagged 26 foreign keys without a covering index (`spec/HEALTH_CHECK_2026-06-27.md` §6) — referenced-row delete/update scans the child table and FK joins are slower.
**Decision:** add `CREATE INDEX IF NOT EXISTS <table>_<col>_idx` for all 26 (additive, idempotent, brief lock on small tables). Version pinned to `20260627120000` so it sorts **after** `folder_permissions` (090000) — two FKs are on `document_/presentation_folder_permissions`, which that migration creates; `apply_migration`'s ~07:00 auto-stamp would have ordered this before those tables exist and broken a fresh `db reset`.
**Verified:** post-apply unindexed-FK count 26→0; repo↔ledger version-set hash parity.

---

## D-084 — RLS initplan fix (8 policies)
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260627130000_rls_initplan_fix` (applied + registered).
**Context:** 8 per-user RLS policies (on `ai_chat_sessions`, `ai_chat_messages`, `ai_corrections`, `team_members`) called bare `auth.uid()`, re-evaluated per row (`auth_rls_initplan`, §5) — the policies added after the earlier `20260621161007_rls_auth_uid_initplan_fix`.
**Decision:** `ALTER POLICY` each to wrap `auth.uid()` → `(select auth.uid())` (InitPlan, evaluated once per query). `ALTER` edits the expression in place — no DROP/CREATE window, role/command/permissive and the rest of each predicate preserved.
**Verified:** post-apply initplan count 8→0; the 8 policies' definitions otherwise unchanged.

---

## D-085 — Lock handle_new_user() EXECUTE
**Date:** 2026-06-27
**Status:** Adopted. Migration `20260627140000_lock_handle_new_user_execute` (applied + registered).
**Context:** `handle_new_user()` (SECURITY DEFINER trigger fn, `AFTER INSERT ON auth.users`) carried a PUBLIC EXECUTE grant → callable by anon/authenticated via RPC (§7). It is never RPC-called; the trigger runs it as owner regardless of caller grants.
**Decision:** `REVOKE EXECUTE … FROM anon, authenticated, public`. Signup is unaffected (the trigger mechanism does not consult EXECUTE). The other SECDEF helpers (`is_admin`/`is_super_admin`/`get_profile_role`/`current_team_member_id`/`can_*_folder`) ARE invoked by RLS as the authenticated role and KEEP EXECUTE — handled post-demo via `spec/SECDEF_REVOKE_TEST_PLAN.md`.
**Reversibility:** `grant execute on function public.handle_new_user() to authenticated, anon, public;`
**Verified:** post-apply grants = `{postgres, service_role}` only; `on_auth_user_created` trigger still on `auth.users`.

---

## D-086 — RAG edge-function warm-up (pg_cron + pg_net)
**Date:** 2026-06-27 (batch versioned `20260628`)
**Status:** Adopted. Migration `20260628100000_rag_warmup_cron_setup` (applied + registered).
**Context:** `rag-query` cold-starts at ~7.9s on the first question after ~5-min idle (`LATENCY_PROBE_2026-06-27.md`). Demo-critical first impression.
**Decision:** pg_cron job `warmup-rag-query` runs every 4 min and POSTs `{warmup:true}` (no `question`) to `rag-query` via `pg_net`; the function returns an early **400** before embed/retrieve/LLM/session — warming the Deno isolate with **zero side effects and zero cost**. Chosen over Vercel Cron: self-contained in Supabase (no plan dependency, no new route/env, **no edge-function redeploy** — lowest risk to the demo-critical function). `*/4` gives margin under the ~5-min cold threshold. Anon (publishable) key redacted in the committed file; live job uses the real key.
**Verified:** `cron.job` shows `warmup-rag-query` active (`*/4`); `net.http_post` returns a request id; the `{warmup:true}` ping returns 400 in ~0.2s.
**Reversibility:** `select cron.unschedule('warmup-rag-query');` (optionally drop `pg_net`).

---

## D-087 — rag-knowledge bucket writes → admin-only
**Date:** 2026-06-27 (batch versioned `20260628`)
**Status:** Adopted. Migration `20260628110000_tighten_rag_knowledge_writes` (applied + registered).
**Context:** Health-check §8 — any `authenticated` user could INSERT/UPDATE/DELETE in the private `rag-knowledge` bucket. Read is intended for all staff; writes should be admin-only.
**Decision:** drop `rag_knowledge_auth_{insert,update,delete}` (bucket_id-only) and recreate as `rag_knowledge_{insert,update,delete}_admin` gated on `public.is_admin()`. `rag_knowledge_auth_select` (read) unchanged. Controlled-timestamp pattern (D-081).
**Verified:** the 4 live policies are now select (authenticated) + insert/update/delete (admin).

---

## D-089 — Revoke SECDEF anon/PUBLIC execute (scoped to 5 of 8 helpers)
**Date:** 2026-06-27 (batch versioned `20260628`)
**Status:** Adopted. Migration `20260628120000_revoke_secdef_anon_public` (applied + registered).
**Context:** `spec/SECDEF_REVOKE_TEST_PLAN.md` proposed revoking anon/PUBLIC EXECUTE on 8 RLS helpers. A pre-flight `pg_policies` check found that **3 of them are referenced by the `{public}` policies** `document_folders_select` / `document_files_select`, which serve `is_public` Document-Library folders/files to **anonymous** visitors by design (`src/lib/documents.ts`). Revoking anon EXECUTE on those would make every anon library read raise `permission denied for function …`. The doc's admin/super/auth-only test matrix would not have caught this.
**Decision:** revoke anon/PUBLIC EXECUTE on the **5** helpers referenced only by `{authenticated}` policies (`is_super_admin`, `get_profile_role`, `current_team_member_id`, `can_access_presentation_folder`, `can_see_presentation_folder`); **keep** anon EXECUTE on the **3** the public library needs (`is_admin`, `can_access_document_folder`, `can_see_document_folder`). `authenticated` keeps EXECUTE on all. `handle_new_user` already locked (D-085).
**Verified (real anon role via PostgREST, not simulation):** grant matrix = anon false on the 5 / true on the 3 / authenticated true on all 8; anon `GET document_folders` → 200 with 2 rows (public library intact); anon `GET presentation_folders` → 200/0 rows (graceful); anon `rpc/is_super_admin` → 401 (locked); anon `rpc/is_admin` → 200 (kept). No app `.rpc()` calls any of the 8.
**Reversibility:** `grant execute on function public.<fn> to anon, public;`
**Future:** the 3 kept helpers stay anon-callable as long as the Document Library has an anonymous public face; revisit if that face is removed.

---

## D-090 — ARCHITECTURE.md re-consolidation (targeted)
**Date:** 2026-06-27
**Status:** Adopted (docs-only).
**Context:** `spec/ARCHITECTURE.md` was a 2026-06-22 snapshot: a 22-table count, "highest migration `20260622193003`", `00NN_` filenames (renamed in D-081), and no mention of the RAG/Wissensbasis/folder-permission tables.
**Decision:** targeted edits (not a rewrite — preserve the D-022 consolidation principle): table count 22→34 + the missing table groups (RAG, Wissensbasis, folder permissions); highest migration → `20260628120000` (82 total); a note that `00NN_` are legacy labels (D-081); and a new **§16 "Hardening sprint 2026-06-27/28"** summarizing D-081–D-090 with live counts.
**Verified:** counts re-queried live (34 tables, 167 functions, 88 policies, 165 indexes, 82 migrations, 9 extensions, 4 cron jobs).

---

## D-091 — Repo drift triage: revert React Compiler WIP + fix pnpm sharp build-approval
**Date:** 2026-06-28 (W1 prep)
**Status:** Adopted.
**Context:** The working tree carried uncommitted drift (flagged in the D-086–090 batch): **(a)** an inert, incomplete **React Compiler** experiment — `react-compiler-runtime` + `babel-plugin-react-compiler` (package.json/lockfile) + a new `babel.config.js` (`presets:[next/babel]`, `plugins:[babel-plugin-react-compiler]`). Next 16 runs Turbopack (which ignores `babel.config.js`), `next.config.ts` has no `experimental.reactCompiler`, and no committed code imports `react-compiler-runtime` → the compiler never ran. **(b)** `pnpm install` exited 1 (`ERR_PNPM_IGNORED_BUILDS` for `sharp`) and wrote a placeholder `allowBuilds: sharp: set this to true or false` into `pnpm-workspace.yaml` — pnpm 11 demanding an explicit build-script decision. **(b), not the React Compiler, was the real "pnpm install fails".**
**Decision:**
  - **Revert** the React Compiler WIP (restore committed `package.json`/`pnpm-lock.yaml`, delete `babel.config.js`) — inert, incomplete, uncommitted. If React Compiler is wanted, add it the Next-16 way: `experimental.reactCompiler: true` in `next.config.ts` (+ the two packages), NOT a `babel.config.js` (which disables Turbopack). Flagged for a deliberate decision.
  - **Fix** `pnpm-workspace.yaml`: `allowBuilds: sharp: false` (matching the existing `unrs-resolver: false`; sharp ships prebuilt binaries and is already in `ignoredBuiltDependencies`). `pnpm install` now exits 0 and the tree stays clean.
**Verified:** `pnpm install` exit 0 ("Already up to date", supply-chain policy passes), tree clean except the intended `sharp: false`; `tsc --noEmit` exit 0; `next build` green. Vercel build unaffected (sharp prebuilt + `serverExternalPackages`).

---

## D-095 — Co-locate Vercel functions with Supabase (fra1), not getUser→getSession
**Date:** 2026-06-28 (W2)
**Status:** Adopted. `vercel.json` `regions: ["fra1"]`.
**Context:** D-094 attributed authed-SSR TTFB (~0.67s) to `auth.getUser()`; the W2 plan was a `getUser→getSession` swap. **Premise recon overrode it:** Vercel `serverlessFunctionRegion` was the default **`iad1` (US East)** while Supabase is **`eu-central-1` (Frankfurt)** → every Supabase call from a function is a transatlantic round-trip (~80–100ms). The folder-tree makes ~4, the signed-URL route 2; `getUser` is just one. Also `getIdentity()` feeds both read-only render AND `requireAdmin`/`requireSuperAdmin`, so it can't be blanket-switched without weakening admin-revocation checks. Full audit: `spec/AUTH_STRATEGY_AUDIT_2026-06-28.md`.
**Decision:** co-locate functions with Supabase via `vercel.json` `regions: ["fra1"]`. Zero app-code, zero security risk, reversible — speeds up every authed route + signed-URL serving at once. The `getSession` swap was **not pursued** (saves ~15ms once co-located, at the cost of `requireAdmin` revocation safety); `getUser` stays everywhere incl. the proxy boundary.
**Verified (prod, before→after):** folder-tree TTFB p50 0.67s→**0.27s** (−60%) / p95 0.90s→**0.38s** (−58%); signed-URL TTFB p50 0.48s→**0.30s** (−37%) / p95 0.87s→**0.44s** (−49%). Preview was Vercel-SSO-protected → verified on prod with revert as the net.
**Reversibility:** delete `vercel.json` (or set region back) + redeploy.

---

## D-099 — RAG eval harness first; "priority-1 crowding / rerank-limit" theory refuted
**Date:** 2026-06-28 (W3)
**Status:** Adopted (harness shipped). Fixes ranked but **not yet applied** — pending sign-off + measured A/B. Next D-number: D-100.
**Context:** W3 opened "RAG Quality" with the recon's headline lever = priority-1 crowding, fixable by raising `RERANK_INPUT_LIMIT` (the D-070 direction). There was **no automated eval** — "92.9%" was one human pass on 2026-06-22; `getQualityStats()` reads the `bewertung` column, never the pipeline. So we built the harness *first* (`scripts/rag-eval.ts`: replay 84 gold questions through the live `rag-query`, LLM-judge vs the 2026-06-22 reference, direction-aware: regression/fixed/correct/still_wrong; captures + deletes the prod sessions it creates).
**Premise recon overrode the plan (telemetry > assumption):** baseline = **77.4% strict (65/84), 15 regressions, worst on the operational FAQ set (64%)** — not 92.9%. But the assumed fix is **refuted**: candidate sets are only ~67 chunks, the `RERANK_INPUT_LIMIT=40` cut already reaches them, and simulating "rerank ALL vs top-40" changed the final-6 in **0** tested cases. Answer-level telemetry shows the live system **had topical context and still refused** (ETI Stornierung; Er Car cited the priority-1 "+20% Servicegebühr" pin instead of the chunk with the ADB/IST numbers). Real causes: (1) ~29 pinned priority-1 rows at `combined_score=1.0` — mostly generic `service_offering`/`team_structure` — win topical rerank slots over the specific operational chunk; (2) over-conservative refusal on topical-but-not-exact context; (3) single-chunk recall gaps (AurumTours/CIZGI); (4) a few content errors (Pegasus PNR, Murat's title).
**Decision:** ship the harness as the durable quality **gate** (do not change RAG behaviour without a before/after run). Do **not** raise `RERANK_INPUT_LIMIT` (measured no effect). Ranked candidate fixes in `spec/RAG_EVAL_BASELINE_2026-06-28.md`: **F1** demote `service_offering`+`team_structure` (~19 rows) priority-1→2 (reversible, highest-leverage, measurable) → **F4** embed the 3 NULL-embedding context rows + **F5** content fixes (safe) → then evaluate **F2** refusal-tuning / **F3** recall-lift with care (hallucination/redeploy risk). Each applied only after sign-off + a measured harness delta.
**Reversibility:** harness is read-only-ish (self-cleans prod sessions); no schema change in this entry. F1 reverts via one `UPDATE company_context SET priority=1 …`.
**Note:** D-096–D-098 exist as W2 build-log/commit identifiers (not DECISIONS entries); W3 starts at D-099 to avoid the collision.

---

## D-100 — RAG fix experiments: F1 neutral (reverted), F4 kept, F2 not shipped; secret-refusal confound found
**Date:** 2026-06-28 (W3)
**Status:** Adopted (negative result + discovery). F1 reverted; F4 kept; F2 deferred to a product decision; denylist-aware harness is the recommended next step.
**Context:** D-099 baseline (77.4% strict). Buhara approved applying F1 (demote priority-1) + F2 (refusal tuning), measured before/after via the harness.
**What the harness measured:** **F1** (demote `service_offering`+`team_structure`, priority-1 31→12) = **76.2% (64/84)** — statistically unchanged, the *same* questions fail. Confirms the D-099 finding that crowding is not the lever. → **F1 REVERTED** (no benefit; unvalidated downside on company/identity questions absent from the gold set). **F4** (embed the 3 NULL `company_context` rows via `embed-knowledge {source:'context',force:true}`) = **kept** (completes the deferred D-070 Phase-2 backfill; harmless, reproducible).
**Discovery (changes the number):** ~5 "regressions" are the system **correctly refusing deliberately-purged secret data** — IBAN/credit-card/password/PayPal questions map to the `SECRET_PAGE_DENYLIST` page `444009709` (D1 security audit). The judge doesn't know the denylist, so it scores correct security refusals as failures. With those + ~2 judge-strict cases excluded, **genuine quality ≈ 84% (~71/84)**.
**Decision on F2 (refusal tuning) — NOT shipped:** premise overridden by evidence. (1) The genuine remaining fails are **retrieval-granularity** (the specific operational chunk isn't surfaced into the final-8), not over-refusal — loosening refusal would make Claude guess → hallucinate. (2) ~5 refusals are **correct security behaviour**; a global refusal-loosen risks answering/hallucinating around purged passwords/cards/IBANs before a CEO/CFO demo. F2 left as an explicit product decision, not an autonomous change.
**Recommended next (all measurable via the harness):** (a) **denylist-aware harness** — mark secret-data gold questions `expected_refusal` so the number reflects genuine quality + never penalises correct security; add company/identity questions to enable validating F1-style changes; (b) **F3 retrieval granularity** (re-chunk single-chunk supplier pages / raise `RETRIEVAL_VECTOR_K`); (c) **validated content corrections** (D-070 pattern, needs human fact sign-off: Pegasus PNR 6-stellig not `Axxx`; Y360 Euro not TL; Mavi Gök DE=DE/AYT, TR=rest).
**Net prod change:** F1 reverted (none), F4 embeddings backfilled (data, regenerable). No schema/migration. Full detail: `spec/RAG_EVAL_BASELINE_2026-06-28.md`.
**Reversibility:** F4 is idempotent re-embed; F1 already restored to priority-1=31.

---

## D-101 — Operational runbook for the demo
**Date:** 2026-06-28 (W3)
**Status:** Adopted. `spec/RUNBOOK.md` created.
**Context:** A keyword scan of all 28 spec docs (W3 recon) confirmed **no operational/incident/rollback runbook existed** — only point-in-time audits (HEALTH_CHECK, latency probes). A solo dev running a live CEO/CFO demo needs a "something broke, what do I do" playbook.
**Decision:** author `spec/RUNBOOK.md` — quick facts (IDs/URLs/regions/latency budget), a tiered pre-demo checklist (T–1week/day/hour), demo-critical-flow→dependency map, a symptom→diagnose→fix incident playbook (AI down, signed-URL 500, login fail, page 500), rollback procedures (Vercel promote-previous, edge-fn redeploy, migration/data revert, embedding regen), and a known-good baseline. Includes the live action items surfaced this sprint (reset the 6 seeded temp passwords, decide Emirkan's role, email-template swap, E2E CI secrets).
**Reversibility:** doc only.

---

## D-102 — W3 final-health pass + derived-doc reconcile
**Date:** 2026-06-28 (W3)
**Status:** Adopted. **🟢 GO for the 2026-08-01 demo, zero blockers.** `spec/HEALTH_CHECK_2026-06-28.md`.
**Context:** Close the W3 batch (D-099–D-101) with a live re-snapshot + ledger-parity re-verify + the derived-doc reconcile the W3 recon flagged (ARCHITECTURE §16 topped at D-090; §1 header "22 tables"/§4 "55 pages" stale; index/policy/function counts disagreed across docs).
**Verified live (Supabase MCP):** 34 tables + 1 view, **163 functions** (docs said 167), 88 RLS policies, 165 indexes, 82 migrations (ledger hash `6355f130…`, repo↔registry **exact**, 0 W3 migrations), 9 buckets, 4 cron (warmup succeeding), 10 auth users, profiles 10 (4 super_admin/5 admin/1 user). Advisors: security 0 ERROR/16 WARN by-design, performance 0 ERROR.
**Decision:** record the GO; reconcile derived docs in the same pass — ARCHITECTURE §16 extended to D-091–D-102 + functions 167→163, §1 "22 tables"→34, §4 "55 pages"→51, highest decision→D-102; BUILD_LOG Current State refreshed. Remaining items are owner-action (temp passwords, Emirkan role, email templates, E2E CI secrets) or post-demo RAG levers — none demo-blocking.
**Reversibility:** doc only.

---

## D-103 — Denylist-aware eval harness → genuine quality measured at 82.1%
**Date:** 2026-06-28 (W3)
**Status:** Adopted. `scripts/rag-eval.ts` updated; full re-run recorded.
**Context:** D-100 found ~5 "regressions" were the system correctly refusing deliberately-purged secret data, and *estimated* genuine quality ≈ 84%. The harness needed to measure that, not estimate it, to be a trustworthy gate.
**Decision:** add a **security exception** to the judge — when the gold reference is/points-to a genuine secret (full IBAN, credit-card number, account password), a correct decline scores PASS as a new `secure_refusal` category; disclosing or fabricating the value is FAIL. Scoped to real credentials only (normal contacts/facts grade normally). Also added a `--frage N,M` filter for targeted replays (F3 aid).
**Measured (full 84, judge=claude-sonnet-4-6):** **genuine 82.1% (69/84)** — 62 correct, **4 secure_refusal** (the IBAN/card/password questions), 3 fixed, 11 regression, 3 still_wrong, 1 uncertain. Exception correctly scoped (4 genuine secrets flipped; PayPal "ask Selin" #23 correctly stayed a regression). Supersedes the D-100 ~84% estimate.
**Finding:** the 14 genuine gaps are **~9 retrieval-granularity** (fact exists, not surfaced → false refusal: ETI/Er Car/CIZGI/Hara Filo/AurumTours/WEGO/Portal-Widerruf/Pegasus-WCH/PayPal), **~4 content errors** (Pegasus PNR, ETI label, Mavi Gök, Kaution), **1 refusal-phrasing** (Lufthansa). Confirms: the lever is **F3 retrieval granularity** + validated content corrections, NOT crowding/refusal-tuning. Detail: `spec/RAG_EVAL_BASELINE_2026-06-28.md`.
**Reversibility:** harness code only (self-cleans prod sessions); no schema/data change.

---

## D-104 — F3 retrieval breadth: genuine RAG quality 82.1% → 86.9%
**Date:** 2026-06-28 (W3)
**Status:** Adopted. `rag-query` redeployed (v13), measured + kept.
**Context:** D-103 measured genuine quality at 82.1% with ~9 retrieval-granularity misses (the fact exists but isn't surfaced into the final-8). An offline token-matched experiment showed widening retrieval + the rerank window recovers the "retrieved-but-cut" subset (Hara Filo, CIZGI), but not true recall misses (Er Car, AurumTours, where the chunk isn't retrieved at all). **This corrected the D-100 "rerank-limit refuted" finding** — that rested on unreliable keyword matching; with exact tokens, widening the window does help.
**Decision:** raise `rag-query` constants `RETRIEVAL_VECTOR_K` 20→60, `RETRIEVAL_TRGM_K` 10→30, `RERANK_INPUT_LIMIT` 40→80 so the Voyage reranker sees ~all candidates instead of only the ~9 operational chunks that survived below the ~31 pinned priority-1 rows. Deploy + measure-after + revert-if-worse.
**Measured (full 84):** **genuine 86.9% (73/84)**, up from 82.1% (+4.8 pts); regressions 11→8; **5 recoveries** (Hara Filo, CIZGI, ETI Stornierung, Pegasus WCH, Mavi Gök); no broad regressions (one borderline judge-variance flip, TUIfly). Latency p50 +0.3s. **Kept.**
**Remaining (10):** 2 recall misses (Er Car/AurumTours → re-chunk, post-demo); ~6 content/granularity incl. the one hallucination (#28 Mietwagen-Kaution asserts a security deposit) → validated content corrections (D-070 pattern, needs fact sign-off); 1 phrasing (Lufthansa).
**Reversibility:** revert the 3 constants in `supabase/functions/rag-query/index.ts` + redeploy (prior = v12). Detail: `spec/RAG_EVAL_BASELINE_2026-06-28.md`.

---

## D-105 — Architecture audit: SEC-01 hotfix (live) + Phase D S1/S2 refactor wave (in PR)
**Date:** 2026-06-28
**Status:** SEC-01 shipped to `main` + live (`37e4c33`); Phase D batch on `audit/phase-d-refactor` (PR open, awaiting review). **Code-only — no migration, no schema change.**
**Context:** Live-source architecture audit (Phase A recon → diagnostic → strategy, each adversarially reviewed) of the App Router + Supabase data flow. Ground truth only (Supabase/Vercel/`main`); the two supplied audit docs were partly stale (one described remediations never present in `main`). Strengths confirmed: service-role discipline (26/26 mutations gated) and the private-asset RLS-read→sign pattern — left intact.
**S0 (shipped to main, verified live):** `/api/search` ran the service-role client with **no auth gate** and **no `status='published'` filter** on `pages`, leaking draft page titles/slugs/paths to anonymous callers (Next 16 `proxy.ts` deliberately doesn't auth-gate — CVE-2025-29927). Fix: 401 for anon + mirror `pages_select_published` for non-admins. Anon `/api/search` now returns 401 on prod.
**Phase D batch (S1+S2, branch/PR; zero functional + zero visual regression):**
- **SEC-02** — `sanitizeNext` consolidated into `@/lib/auth` + applied to both login redirect sinks (+ backslash hardening). The prior reverted `audit/phase-2-security-cache-hardening` attempt was an abandoned ~5-min experiment, not a regression (verified via GitHub).
- **CM-01 / PERF-04** — `next/dynamic` AIChatWindow + CorrectionModal; react-markdown leaves the dashboard initial bundle.
- **HC-01** — `src/config/navigation.ts` single-sources the nav constants; pre-paint script generated from `LIBRARY_ROUTE_PREFIXES` (kills the lock-step duplication; output verified byte-equivalent).
- **PERF-03** — folder counts/previews batched to one query per level (was N+1); RLS + ordering preserved.
- **CM-02** — shared server-action helpers (`toMessage` / `UUID_RE` / `revalidate*`) → `src/lib/library/actions-shared.ts`. Data-layer folder-tree generic deferred (DTO divergence; poor risk/reward on the most-used path).
- **CM-03** — admin + library modals code-split via `next/dynamic` (kept mounted; only the chunk deferred).
**Gates:** `pnpm typecheck` + `pnpm build` green per commit.
**Deferred / STOP-gated (NOT in this PR — need explicit sign-off):** PERF-01 cookie-free cached CMS reads (+ TTL choice), SEC-03 CSP header, SEC-04 rate-limiting, SEC-06/DB advisor hardening (anon `SECURITY DEFINER` revoke, multiple-permissive-policy merges, unused-index drops — schema/prod sign-off).
**Reversibility:** revert the branch commits; the SEC-01 revert would restore the unfiltered query (not recommended). No schema to roll back.

---

## D-106 — AI UX wave: Sonnet generation, chip preamble, strict language mirroring, working web-search fallback
**Date:** 2026-06-29
**Status:** Shipped to `main` + deployed (frontend → Vercel; `rag-query` redeployed v14). Code + edge-function only — no migration, no schema change. **Follow-up wave consolidated into D-107** — `rag-query` progressed v14 → v15 → v16 (Personennamen experiment) → v17 (revert to v15 source) → v18 (Phase 5b+1.5a+7b bundle); D-107 added the first schema change (`20260629140000`).
**Context:** Four owner-requested improvements to the airtuerk Intelligence surface, shipped together.
**Decisions:**
- **Model Opus 4.8 → Sonnet 4.6.** `ANTHROPIC_MODEL` in `rag-query` switched to `claude-sonnet-4-6` (supersedes the D-060 Opus choice). Same request surface (no temperature / thinking / prefill) → a pure model-ID swap; Sonnet 4.6 is also the floor for the `web_search_20260209` tool below. ⚠️ Re-run `scripts/rag-eval.ts` to re-baseline genuine quality on Sonnet — the D-104 86.9% was measured on Opus.
- **AI-Mode-Chip personalization preamble.** Chip results (translate / mail / summary / escalation) now render a greeting — "Hallo {Vorname}, hier ist {…}:" — as **UI chrome above** the answer (`src/lib/rag/preamble.ts` + `AIAnswerBlock`), never inside `answer.text`, so the copy-paste payload stays clean. Language mirrors the input (DE/EN/TR heuristic); `firstName` threaded from `getIdentity` via `page.tsx`.
- **Strict language mirroring.** Rules 3/7/8 in `rag-query` (uncertainty / out-of-scope / identity) made multilingual (DE/EN/TR variants) instead of hard-forced German; the Rule 4 "always German" exception removed. Mode prompts (summarize / escalation) hardened to mirror strictly (observed English→German miss). Frontend `isOutOfScope` + `inferKonfidenz` upgraded to detect all three languages (else EN/TR refusals lose the web-search button + low-confidence marking).
- **Working web-search fallback (Workstream 4).** New `web-search` mode runs Claude with the Anthropic-hosted `web_search_20260209` server tool under a focused, language-mirrored prompt (no corpus, no team tool). The previously-disabled "Yes, search the web" button (the rule-7 offer) now fires a fresh web-search turn for the same question. Known v1 limits: a `pause_turn` (10-search cap) ends the turn without continuation; web source-chips not captured (the answer carries its own source mentions).
**Gates:** `pnpm typecheck` + `pnpm build` green; frontend browser-verified (preamble DE/EN, button enabled + wired); prod verified post-deploy.
**Reversibility:** revert the commit (frontend) + redeploy prior `rag-query` (v13 = Opus 4.8, German-only protocol phrases, no web search). No schema to roll back. (Superseded for current rollback: the live last-known-good is now `37eb9b3` = v15/v17 source — redeploy as v19; see D-107.)

---

## D-107 — AI observability + web-search hardening (v18 bundle)
**Date:** 2026-06-29
**Status:** COMPLETE, deployed (edge `rag-query` v18 + Vercel `1fcfd47` + migration `20260629140000`).
**Summary:** Consolidates the D-106 follow-up wave — the 5b citation-chip parser, 1.5a latency cap, 1.5b loading UI, and the 7a/7b observability migration + population — plus the v16 Personennamen experiment and its variance-evidenced revert. First schema change since D-080.

**Scope:**
- **Phase 5b** (`634938c`): parse `web_search_tool_result` blocks server-side (content arrives fully-populated at `content_block_start`) into `source_type:'web_search'` citation chips; dedup by URL, drop `encrypted_content`, store `page_age`. Widened `RagSource.source` TS union (`web_search` | `team_directory`).
- **Phase 1.5a** (`ceda761`): web_search `max_uses` 5→3 — bounds demo-day latency (~90–100s worst case).
- **Phase 1.5b** (`3e8132a`): two-tier web-search loading UI (`ChatLoading`) — Tier 1 immediate, Tier 2 after 8s; DE/EN/TR mirrored; reuses `.ai-chat-paused-notice` styling.
- **Phase 7a** (`8fd1a18`): migration `20260629140000_ai_observability` adds `mode` text / `tool_calls` jsonb / `ttft_ms` int (all nullable) — applied via the D-081 controlled-version pattern.
- **Phase 7b** (`1fcfd47`): edge fn populates the new columns with defensive defaults.
- **Bundle Deploy v18:** single edge-fn redeploy (4 + 4b + 5b + 1.5a + 7b) + Vercel push (5b + 1.5b frontend).

**Sub-decisions:**
- **A — `ttft_ms` uses the same `startTime` as `latency_ms`.** Math-invariant `ttft ≤ latency`; clean first-token/last-token pair. Embed+retrieval latency is a separate concern, not "time to first answer token".
- **B — `tool_calls` shape is count-based, no per-tool timing.** Per-tool `started/completed_at` is not currently captured and adding it is invasive; the count-based shape (`team_directory` entries from `toolCallsLog` + `{tool:'web_search', uses, unique_urls}`) captures what a dashboard needs.
- **C — `weiss-nicht` path skipped.** `streamWeissNichtResponse` writes its own row and was not threaded the new columns (stay NULL/[]); structurally unreachable per its own comment. Logged as a post-mission reachability-review ticket.
- **D — `retrieved_chunks.metadata.calls` hack kept parallel.** The UI team-directory chip renders from it; `tool_calls` becomes the canonical source while the hack stays for backward compat until a post-D-107 UI migration.

**Variance evidence (v16 → v17 revert):**
- v16 removed the "Personennamen (Ansprechpartner, Funktionen)" category from rag-query Rule 1's anti-hallucination list (hypothesis: unblock contact answers).
- Single-draw eval: **78.6%** (84-row gold set), −7.1pp vs v15's 85.7%.
- Variance analysis **n=3 on identical v16 config: 78.6% / 83.3% / 81.0% → μ=80.97%, σ=2.35pp**. v15 reference 85.7% sits at the μ+2σ boundary (85.67%) → math test failed → **revert per pre-registered rule**.
- `37eb9b3` (= v15 source) redeployed as **v17** same day. **t3#28 (Provision hallucination guard) intact in both v15 and v16** — no demo-critical loss from the revert.
- 12 stable v16 regressions sat in categories the edit didn't touch (PNR, fees, Portal names) → **retrieval/corpus root cause, not prompt-experiment causation**.
- **Methodology decision:** single-draw eval baselines (86.9% Opus, 85.7% Sonnet) are unreliable for CI-gate pinning; a clean **n≥3 baseline** on v18 is a Phase 10 prerequisite. Single-draw eval stays valid for regression smoke checks.

**D-081 controlled-version pattern reuse:** migration applied via `execute_sql` (DDL) + an explicit `schema_migrations` INSERT at a chosen version (`20260629140000`), NOT MCP `apply_migration` (auto-timestamp → drift). File ↔ ledger executable SQL byte-matched; count reconciled 82→86. Additive nullable columns → no DB rollback needed even on full deploy revert.

**Production state at completion:**
- Edge: `rag-query` **v18** ACTIVE, verify_jwt true, sha256 `ab0b9db571895220e29d94e2ae8924907b5ef481735b702a2138553727fb5777`.
- Vercel: `dpl_7JYEWQKSY3Wu1b7fB76PjfTu1TjR` at `1fcfd47`, www.airtuerk.dev, region fra1.
- DB: `20260629140000_ai_observability` applied + registered, 482-row baseline preserved.
- Smoke 4/4 + DB observability 4/4 live: C1 Provision refusal (demo-critical guard), C2 RAG sanity (8 sources), C3 combined 5b+1.5a+7b (`web_search` uses=2, unique_urls=9, 34s latency), C4 out-of-scope refusal + web offer.

**Reversibility / rollback:**
- Edge: deploy `37eb9b3` source as v19 (~1 min).
- Frontend: Vercel UI promote `dpl_oErj9jACjubiVriJxviXh7yb1Ajb` (`b5aeb0a`) to production (~30s; `isRollbackCandidate`).
- DB: leave migration in place (additive nullable, no harm).

**Pending (out of D-107 scope):** Phase 9 (live incognito verify); Phase 10 (CI eval gate + variance-aware n≥3 baseline on v18, ~$8–15); Phase 6 (cleanup — 4 smoke rows ids 2206/2208/2210/2212 + paired user rows); post-mission — weiss-nicht reachability review (sub-decision C), UI migration to read `tool_calls` (sub-decision D sunset), corpus contact-routing correction (PayPal→Selin via ai_corrections).

**References:** predecessor D-106 (Sonnet + web-search + safety); pattern source D-081 (controlled-version migrations) + D-082 (reconciliation). Commits: `634938c`, `ceda761`, `3e8132a`, `8fd1a18`, `1fcfd47` (+ `893e8a5` + `37eb9b3` from D-106, active in v18).

---

## D-110 — AI-Attach for PDF/DOCX (Dashboard SearchAIBox + AIChatWindow)
**Date:** 2026-06-30
**Status:** Code complete on `claude/ai-attach-pdf-docx-kxz7n0` (PR #22, 3 commits); edge `rag-query` redeploy + live preview-verify pending owner sign-off.
**Summary:** Enables the previously-disabled `.ai-search-attach`/`.ai-chat-attach` plus-button so a user can attach ONE PDF or DOCX, sent ephemerally with the prompt to Claude (translate/summarize/ask). No storage, no embedding. PDF as a base64 document block (GA on `anthropic-version: 2023-06-01`, NO beta header); DOCX text-extracted client-side via mammoth. New server attach-branch bypasses RAG when `mode==='default' && attached_file`.

**Scope:**
- **Layer 1 — backend** (`bbe3c0a`): `rag-query` attach-branch + `RagQueryOptions.attachedFile`; `streamClaudeResponse` content widened `string`→`unknown` (PDF block array); `validateAttachedFile` (413/400); filename logged via a synthetic `attached_file` retrieved_chunks entry (no migration).
- **Layer 2 — client** (`31ea3cb`): plus-button enablement + file picker + 10 MB/ext validation + chip + `mammoth` (dynamic import) in both surfaces; `src/lib/attachment.ts` shared helper; `AiTurn.attachedFile` filename-only marker for reopen/reload continuity.
- **Layer 3 — polish** (this commit): EN quick-action pills (Summarize / Translate EN / Key Points — all `mode='default'`); Fork-6 `model!=='claude'` gating (model threaded into AIChatWindow); web-search clears the file; chip/pills CSS (token-based light/dark); a11y focus-return; docs.

**Sub-decisions:**
- **A — Filename logging via a synthetic `retrieved_chunks` entry, not a `metadata` column.** `ai_chat_messages` has no `metadata` column; the synthetic `attached_file` chunk (filename only) keeps commit 1 migration-free and is verified not to crash `ragToAiSource`/`chunksToSources`.
- **B — Numbered D-110, not the brief's "D-108".** The DECISIONS log ran to D-107; "D-108" was already an informal code-comment label (chat-typography pass: `theme.css`, `dashboard-hero.css`, `AIAnswerBlock.tsx`) and D-109c is the in-progress web-search work in `BUILD_LOG`. D-110 is the next collision-free formal number; D-108/D-109 are intentionally skipped as DECISIONS entries.
- **C — Multi-turn = re-attach per turn (V1).** The file is cleared on send; a follow-up without a re-attached file runs full RAG, so document turns require re-attaching.
- **D — Fork-6 model-gating kept as a cheap `model!=='claude'` expression, inert until a model-picker ships.** No `ModelSelector` wiring / `localStorage` persistence in scope; `model` is threaded into AIChatWindow so its button isn't permanently disabled.
- **E — Pills stay `mode='default'`** so the attach-branch handles them (a RAG_BYPASS mode would silently drop the file).
- **F — DOCX scaffolding is language-neutral** (`<document>` tags, not German `Dokument:`/`Frage:` labels) per D-106 strict mirroring; PDF is GA (no `anthropic-beta`).
- **G — Web-search clears the attached file** so a web-search re-trigger never ships base64 into a branch that ignores it.

**Pre-spike:** a ~14 MB base64 JSON body reaches the `rag-query` handler (Supabase edge body budget OK) → base64-in-JSON transport confirmed; no signed-URL upload fallback needed.

**Reversibility / rollback:** all additive — optional types, branch gated on `mode==='default' && attached_file`, `string`→`unknown` is a strict superset, no migration. Edge: redeploy the prior `index.ts`. Frontend: revert the 3 commits / promote the prior Vercel deploy. DB: nothing.

**Pending (out of scope):** multi-file; library-bucket persistence; TXT/RTF/ODT/images; vector embedding; GPT/Gemini routing; `ModelSelector` wiring (Fork-6 inert until then).

**References:** predecessor D-104 (search badges, `826b48a`). Plan: `spec/D-110_AI_ATTACH_PLAN.md`. Commits: `bbe3c0a`, `31ea3cb`, + this polish commit.

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

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

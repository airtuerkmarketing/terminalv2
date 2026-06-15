# terminalv2 — Build Log

Running record of what's been built, when. Newest entries on top.

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

### Bucket organization

- images/brand-logos/{brand-slug}/ — logos per brand
- images/icons/ — UI icons (~26 files)
- images/desktop-backgrounds/ — wallpapers
- images/favicon/ — favicons
- images/team-backgrounds/ — call-airtuerk photos
- images/stock-photography/ — photographer-named stock
- images/product-shots/ — mockups, product images
- images/thumbnails/ — document preview thumbnails
- images/opengraph/ — OG/social preview images
- images/misc/ — 405 generic photos
- documents/{category}/{brand-slug?}/ — categorized documents
- videos/master/ — mp4, webm masters
- videos/posters/ — video poster jpgs

### Deviations from spec

- 12 fonts not yet uploaded. Decision: defer to Phase 3 because Next.js scaffold uses next/font/local with files in /public/fonts/. The fonts bucket exists for future use but is empty for v1.

### Next: Phase 3 — Next.js scaffold

---

## Phase 1 — Infrastructure (COMPLETE — 2026-06-15)

**Status:** All infrastructure provisioned and verified.

### What was done

- Supabase project terminalv2 (ref: zkydrymygjrscjbhusxp)
- Region: eu-central-1 (Frankfurt), Pro tier, Postgres 17.6.1
- All 6 migrations applied via Supabase MCP
- 9 tables, RLS enabled on all
- 4 Storage buckets (images, documents, videos, fonts)
- 8 brands seeded, 56 pages seeded
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

## Phase 3+ roadmap

- Phase 3 — Next.js scaffold (auth, layouts, login)
- Phase 4 — Public frontend (sidebar, blocks, layouts)
- Phase 5 — Admin CMS (page editor, asset/doc/team managers)
- Phase 6 — Hardcoded interactives (team, workflow, signature, configurator)
- Phase 7 — Polish + cutover (DNS to Vercel)
- Phase 8 — RAG search (separate scope, later)

---

## Logging rules

- Entries terse: what changed, when, why if non-obvious
- Decisions go in DECISIONS.md, not here
- File forward only — never rewrite history
- Phase transitions get a header bump

## Phase 3 — Next.js scaffold + auth shell (completed)

**Date:** 2026-06-15
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
  (Assets count is 759, not 708 — uploaded set is slightly higher than original
  manifest count; investigate dedup in Phase 5 admin tooling)
- Sign out → /login OK
- Production (terminalv2-dusky.vercel.app): identical behaviour verified

### Commits
- 317338e feat(auth): add login + admin shell with supabase auth

### Phase 3 follow-ups (deferred)
- Database types generation: add `db:types` script to package.json
- Fonts: upload Inter + GeneralSans to public/fonts/, configure next/font/local
- Phase 4 onwards: see PHASE_PLAN.md
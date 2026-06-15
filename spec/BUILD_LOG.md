# terminalv2 — Build Log

Running record of what's been built, when. Newest entries on top.

---

## Phase 0 — Planning (revision 2, complete)

**Status:** Specification corrected after audit. Awaiting infrastructure
provisioning to start Phase 1.

**Revision 2 fixes (applied to all documents):**
- ✅ SOURCE_INVENTORY.md added — full zip contents enumerated
- ✅ Real SQL migrations written (0001-0006) — replaces summary tables
- ✅ .env.example written with modern Supabase key names
- ✅ Page count corrected: 48 → 52
- ✅ Landing page: block-driven with `full_path = '/'` (D-022)
- ✅ Hardcoded routes also have `pages` rows via `rendering_mode` (D-021)
- ✅ `color_entry` removed from block list (sub-shape of `color_palette`)
- ✅ Next.js 15 async API pattern documented in ARCHITECTURE §7
- ✅ team_member_brands junction added (D-026)
- ✅ profiles trigger added as 0006 (D-027)
- ✅ Local dev runs against remote Supabase (D-024)
- ✅ Supabase keys updated to `sb_publishable_`/`sb_secret_` (D-029)
- ✅ Identity Configurator scoped (D-025)
- ✅ Migrations applied via Supabase MCP for v1 (D-030)
- ✅ Full-text search moved to migration 0007, not 0001
- ✅ FK ON DELETE behaviors specified
- ✅ Column types, nullability, defaults all in SQL

**Deliverables in this revision:**
- `README.md`
- `ARCHITECTURE.md`
- `DECISIONS.md` (D-001 through D-030)
- `SOURCE_INVENTORY.md`
- `PHASE_PLAN.md`
- `PRE_FLIGHT.md`
- `CONTRIBUTING.md`
- `BUILD_LOG.md` (this file)
- `.env.example`
- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_rls_policies.sql`
- `supabase/migrations/0003_storage_buckets.sql`
- `supabase/migrations/0004_seed_brands.sql`
- `supabase/migrations/0005_seed_pages.sql`
- `supabase/migrations/0006_profiles_trigger.sql`

**Open items before Phase 1:**
- [ ] User reads PRE_FLIGHT.md and ticks confirmations
- [ ] User creates GitHub repo `airtuerkmarketing/terminalv2`
- [ ] User installs Node 20/22 LTS + pnpm locally
- [ ] User confirms Supabase organization + admin email
- [ ] User confirms tier (free)

---

## Phase 1+ roadmap

Pulled from PHASE_PLAN.md for quick reference:

- **Phase 1** — Infrastructure (Supabase, Vercel, GitHub, migrations applied)
- **Phase 2** — Asset upload (manifests + bulk upload)
- **Phase 3** — Next.js scaffold (auth, layouts, login)
- **Phase 4** — Public frontend (sidebar, blocks, layouts)
- **Phase 5** — Admin CMS (page editor, asset/doc/team managers)
- **Phase 6** — Hardcoded interactives (team, workflow, signature, configurator)
- **Phase 7** — Polish + cutover (DNS to Vercel)
- **Phase 8** — RAG search (separate scope, later)

---

## Logging rules

- Entries are terse: what changed, when, why if non-obvious
- Decisions go in DECISIONS.md, not here
- File forward only — never rewrite history
- Phase transitions get a header bump

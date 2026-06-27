# terminalv2

Internal brand portal for airtuerk Service GmbH — a from-scratch rebuild of
[terminal.airtuerk.de](https://terminal.airtuerk.de), replacing the Webflow
hosting with a fully self-owned stack.

## What this is

A Next.js application that serves as the single source of truth for airtuerk's
visual identity, brand assets, partner documents, team directory, and product
documentation across **15 brand records** organized in a two-level hierarchy.

## Status

**Current phase:** Phase 4 COMPLETE and deployed. File System v2 (roles + folder
Document Library), the User Panel, and the Presentation Hub rebuild have shipped since;
much of Phase 6/7 (APIX ports, signatures, search, DNS cutover) is also done. Phase 5
(full Admin CMS) is the main remaining block.

See `spec/BUILD_LOG.md` for full progress.

## Stack

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS 4 + iOS 18 Liquid Glass tokens | latest |
| Database | Supabase Postgres | 17 (Frankfurt) |
| Auth | Supabase Auth | publishable+secret keys |
| Storage | Supabase Storage | 9 buckets |
| Hosting | Vercel | Edge runtime |
| Package manager | pnpm | 11.x |
| Repo | github.com/airtuerkmarketing/terminalv2 | private |

## Documents in `/spec/`

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | System design, schema, block taxonomy, routing, brand hierarchy |
| `DECISIONS.md` | Locked design decisions (D-001 through D-091) |
| `DESIGN_SYSTEM.md` | iOS 18 Liquid Glass design language |
| `EMBEDS_INVENTORY.md` | Webflow embeds preserved for Phase 6 |
| `SOURCE_INVENTORY.md` | Full inventory of the Webflow zip |
| `PHASE_PLAN.md` | Phase-by-phase execution plan with exit criteria |
| `BUILD_LOG.md` | Running progress record |
| `CONTRIBUTING.md` | Branches, commits, deployment workflow |

| Folder | Purpose |
|---|---|
| `spec/embeds/` | 12 custom HTML/CSS/JS files preserved from Webflow (~224 KB) |
| `spec/mockups/` | Design reference HTML mockups |

## Supabase migrations

> **82 migrations**, in exact parity with the live `schema_migrations` registry. In the
> 2026-06-27 ledger reconcile (**D-081**) the legacy `00NN_*` files were renamed to their
> registered `<timestamp>_<name>.sql` versions — the `00NN_` labels below are kept as
> readable identifiers; see `supabase/migrations/` for the actual (timestamped) filenames.

| File | Purpose |
|---|---|
| `0001_initial_schema.sql` | Full DDL with types, constraints, indexes |
| `0002_rls_policies.sql` | Row Level Security |
| `0003_storage_buckets.sql` | Initial 4 storage buckets (now 9 — see 0025/0031/0033 + avatars; D-007 superseded) |
| `0004_seed_brands.sql` | Initial 8 brands |
| `0005_seed_pages.sql` | Initial 56-page tree |
| `0006_profiles_trigger.sql` | Auto-create profile on signup |
| `0007_brand_hierarchy_and_sidebar.sql` | Brand hierarchy columns |
| `0008_restructure_brands.sql` | IBE products, service-center rename, 52 pages |
| `0009_design_system_settings.sql` | Design tokens, sidebar config |
| `0010_fix_brand_card_colors.sql` | Brand card colors to match design system |
| `0011`–`0029` | Content seeds, APIX Webflow ports, team/IBE seeds, intelligence layer (see `supabase/migrations/`) |
| `0030_role_model.sql` | Three-tier roles (super_admin/admin/user), `is_super_admin()`, `user_role_defaults` (D-047/048) |
| `0031_document_library_filesystem.sql` | Document Library v2: folder tree + files, RLS, private `library` bucket, pg_trgm (D-049–054) |
| `0032_profiles_role_escalation_guard.sql` | Restrict profile role changes to super-admins (D-055) |
| `0033_presentation_hub.sql` | Presentation Hub folder/file model + tables |
| `20260621*`–`20260622*` (10 migrations) | User Panel: profiles↔team_members link, `user_activity_log`, `profiles_v` view, avatars bucket, RLS recursion / search_path fixes |
| `20260623*`–`20260626*` | RAG/Wissensbasis foundation + retrieval, Document Library & Presentation Hub folder colour/Trash/visibility (D-074–079) |
| `20260627090000_folder_permissions.sql` | Per-user folder grants: `document_folder_permissions`/`presentation_folder_permissions` + `current_team_member_id()`/`can_access_*`/`can_see_*` helpers + widened SELECT policies (D-080) |
| `20260627100000_drift_repair_register_missing_migrations.sql` | Ledger reconcile: backfill the 5 unregistered migrations + register self; pairs with 34 file renames (D-081) |
| `20260627110000_harden_gold_set_and_documents_bucket.sql` | Drop `gold_set_answers` open-INSERT policy + privatize unused public `documents` bucket (D-082) |
| `20260627120000_fk_covering_indexes.sql` | 26 covering indexes for previously-unindexed foreign keys (D-083) |
| `20260627130000_rls_initplan_fix.sql` | Wrap `auth.uid()`→`(select auth.uid())` in 8 per-user RLS policies (D-084) |
| `20260627140000_lock_handle_new_user_execute.sql` | Revoke EXECUTE on `handle_new_user()` from anon/authenticated/PUBLIC (D-085) |
| `20260628100000_rag_warmup_cron_setup.sql` | pg_cron+pg_net warm-up: ping `rag-query` every 4 min to dodge cold-start (D-086) |
| `20260628110000_tighten_rag_knowledge_writes.sql` | `rag-knowledge` bucket writes → admin-only; read unchanged (D-087) |
| `20260628120000_revoke_secdef_anon_public.sql` | Revoke anon/PUBLIC EXECUTE on 5 RLS helpers (3 kept for the public Document Library) (D-089) |

## Design system

**iOS 18 Liquid Glass** — translucent surfaces, ambient orbs, Quantum Blue (`#0A82DF`) as UI accent.

Details: `spec/DESIGN_SYSTEM.md` | Reference: `spec/mockups/v3-01-dashboard.html`

## Quick start

```bash
git clone git@github.com:airtuerkmarketing/terminalv2.git
cd terminalv2
pnpm install
cp .env.example .env.local
pnpm dev
```

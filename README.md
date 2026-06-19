# terminalv2

Internal brand portal for airtuerk Service GmbH — a from-scratch rebuild of
[terminal.airtuerk.de](https://terminal.airtuerk.de), replacing the Webflow
hosting with a fully self-owned stack.

## What this is

A Next.js application that serves as the single source of truth for airtuerk's
visual identity, brand assets, partner documents, team directory, and product
documentation across **15 brand records** organized in a two-level hierarchy.

## Status

**Current phase:** Phase 3.5 COMPLETE (design system + brand hierarchy). Phase 4 next.

See `spec/BUILD_LOG.md` for full progress.

## Stack

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS 4 + iOS 18 Liquid Glass tokens | latest |
| Database | Supabase Postgres | 17 (Frankfurt) |
| Auth | Supabase Auth | publishable+secret keys |
| Storage | Supabase Storage | 4 buckets |
| Hosting | Vercel | Edge runtime |
| Package manager | pnpm | 11.x |
| Repo | github.com/airtuerkmarketing/terminalv2 | private |

## Documents in `/spec/`

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | System design, schema, block taxonomy, routing, brand hierarchy |
| `DECISIONS.md` | Locked design decisions (D-001 through D-046) |
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

| File | Purpose |
|---|---|
| `0001_initial_schema.sql` | Full DDL with types, constraints, indexes |
| `0002_rls_policies.sql` | Row Level Security |
| `0003_storage_buckets.sql` | 4 storage buckets |
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

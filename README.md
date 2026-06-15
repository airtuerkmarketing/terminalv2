# terminalv2

Internal brand portal for airtuerk Service GmbH — a from-scratch rebuild of
[terminal.airtuerk.de](https://terminal.airtuerk.de), replacing the Webflow
hosting with a fully self-owned stack.

## What this is

A Next.js application that serves as the single source of truth for airtuerk's
visual identity, brand assets, partner documents, team directory, and product
documentation across all eight airtuerk brands.

## Stack

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | latest |
| Database | Supabase Postgres | 15 (Frankfurt) |
| Auth | Supabase Auth | publishable+secret keys |
| Storage | Supabase Storage | 4 buckets |
| Hosting | Vercel | Edge runtime |
| Package manager | pnpm | 9.x |
| Node | local install | 20 LTS or 22 LTS |
| Repo | github.com/airtuerkmarketing/terminalv2 | private |

## Documents in `/spec/`

| File | Purpose |
|---|---|
| `README.md` | This file — overview, daily commands |
| `ARCHITECTURE.md` | System design, schema, block taxonomy, routing |
| `DECISIONS.md` | Locked design decisions (D-001..D-026) |
| `SOURCE_INVENTORY.md` | Full inventory of the Webflow zip (pages, assets, docs) |
| `PHASE_PLAN.md` | Phase-by-phase execution plan with exit criteria |
| `PRE_FLIGHT.md` | Pre-build checklist |
| `CONTRIBUTING.md` | Branches, commits, deployment workflow |
| `BUILD_LOG.md` | Running progress record |
| `.env.example` | Required environment variables |
| `supabase/migrations/0001_initial_schema.sql` | Full DDL with types, constraints, indexes |
| `supabase/migrations/0002_rls_policies.sql` | Row Level Security |
| `supabase/migrations/0003_storage_buckets.sql` | 4 storage buckets |
| `supabase/migrations/0004_seed_brands.sql` | 8 brands |
| `supabase/migrations/0005_seed_pages.sql` | 56-page tree |
| `supabase/migrations/0006_profiles_trigger.sql` | Auto-create profile on signup |

## Quick start (after Phase 3 scaffold exists)

```bash
# Clone
git clone git@github.com:airtuerkmarketing/terminalv2.git
cd terminalv2

# Install
pnpm install

# Copy env, fill in Supabase values
cp .env.example .env.local

# Generate types from remote DB
pnpm db:types

# Run dev server (connects to remote Supabase in Frankfurt)
pnpm dev
```

## Environments

| Environment | URL | Branch | Auto-deploy | Database |
|---|---|---|---|---|
| Production | terminal.airtuerk.de | `main` | Yes | Supabase Frankfurt |
| Preview | `terminalv2-git-*.vercel.app` | any PR | Yes | Supabase Frankfurt (same) |
| Local | localhost:3000 | working tree | Manual | Supabase Frankfurt (same) |

**Note:** v1 uses one shared remote database across all environments. Local Docker
Supabase is optional and not required for development (decision D-024).

## Status

See `BUILD_LOG.md` for current phase and progress.

# terminalv2

Internal brand portal and knowledge hub for airtuerk Service GmbH —
a from-scratch rebuild of terminal.airtuerk.de, replacing the prior Webflow
hosting with a fully self-owned stack.

**Production:** https://terminal.airtuerk.ai

## What this is

A single source of truth for airtuerk's visual identity, partner documentation,
team directory, and product docs — serving ~63 internal users across 15 brands.
It pairs a CMS-driven brand portal (brand guidelines, APIX + IBE product pages,
asset / document / presentation libraries, team directory) with **airtuerk
Intelligence**, an AI knowledge layer that searches the Confluence knowledge base
and brand content to answer internal service questions. The platform is
auth-gated throughout — there is no public content.

## Status

- **HEAD:** `5c10519` on `main` (442 commits since 2026-06-15)
- **Latest milestone:** D-107 — AI observability + web-search hardening
- **Highest decision:** D-107 (`spec/DECISIONS.md`)
- **Demo target:** 2026-08-01

## Stack

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| UI runtime | React / react-dom | 19.2.4 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS | 4.3.1 |
| DB client | @supabase/supabase-js | 2.108.1 |
| Validation | zod | 4.4.3 |
| Runtime | Node | 24.16.0 |
| Package manager | pnpm | 11.7.0 |
| Hosting | Vercel | fra1, Turbopack |
| Database | Supabase Postgres | 17 (eu-central-1) |

RAG generation runs in Supabase Edge Functions (Deno), not the Next app — the
Anthropic and Voyage SDKs are not Next dependencies.

## Database

- **Migrations:** 86 on `main` (D-081 file↔registry reconcile). *(The prod DB
  ledger currently holds 87 — one in-flight migration, `20260630120000`, applied
  ahead of its merge to `main`.)*
- **Pages:** 51 published
- **Brands:** 15
- **Team members:** 63
- **Profiles / auth users:** 11 / 11
- **Assets:** 719
- **Document Library:** 9 folders / 5 files
- **Presentation Hub:** 0 / 0 (model live, content pending)
- **RAG corpus:** 365 Confluence chunks + 43 brand chunks + 39 company-context entries
- **Storage buckets:** 9 — 4 public (`avatars`, `fonts`, `images`, `videos`)
  · 5 private (`confluence-attachments`, `documents`, `library`,
  `presentations`, `rag-knowledge`)
- **RLS:** enabled on all 34 public tables

## Features shipped

- **Brand pages** — 15 brand records in a two-level hierarchy; top-level brands
  render as single-scroll pages with anchored child sections.
- **APIX tools** — workflow, global network map, presentation player, and
  group-structure org chart (all four ported from Webflow to typed React).
- **File System v2** — three-tier roles (super_admin / admin / user) and a
  folder-based Document Library with per-user folder permissions (D-049–D-080).
- **User Panel** — profile↔team_member link, activity log, avatar uploads.
- **Presentation Hub** — folder model, thumbnails, type-icons (mirrors the
  Document Library construct).
- **airtuerk Intelligence (RAG)** — Voyage `voyage-4-large` embeddings + Voyage
  `rerank-2.5` reranking + Claude Sonnet 4.6 (`claude-sonnet-4-6`) generation;
  hybrid retrieval (vector + trigram + identity-reserved rerank; K 60/30,
  rerank window 80).
- **Gold-Set evaluation framework** — 28 questions across 3 test sets (84
  reference answers), n≥3 variance runs, validated by internal QA. Current
  baseline pending a clean re-run.
- **Security hardening** — role-escalation guard, ledger reconcile, FK covering
  indexes, RLS initplan perf fix, SECURITY DEFINER anon EXECUTE revokes
  (D-082–D-089).
- **AI observability** — per-message `mode` / `tool_calls` / `ttft_ms` columns;
  web-search fallback via the Anthropic `web_search` server tool (D-106/D-107).

## Documents in /spec/

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | System design, schema, block taxonomy, routing |
| `DECISIONS.md` | Locked design decisions (D-001 through D-107) |
| `DESIGN_SYSTEM.md` | Design tokens, theming model, component conventions |
| `BUILD_LOG.md` | Running progress record (authoritative status source) |
| `PHASE_PLAN.md` | Original phase plan (historical — see BUILD_LOG for current status) |
| `CONTRIBUTING.md` | Branches, commits, deployment workflow |
| `EMBEDS_INVENTORY.md` | Webflow embeds preserved for porting |
| `SOURCE_INVENTORY.md` | Webflow source inventory |

| Folder | Purpose |
|---|---|
| `spec/embeds/` | Preserved HTML/CSS/JS from Webflow |
| `spec/mockups/` | Design reference mockups |
| `spec/demos/` | Demo artifacts |

## Supabase migrations

All migrations are timestamp-named (`YYYYMMDDHHMMSS_*.sql`); grouped by date and theme:

| Range | Purpose |
|---|---|
| `20260615*` | Initial schema, RLS policies, storage buckets, brand/page seeds, brand hierarchy, design-system settings |
| `20260616*`–`20260617*` | Brand content seeds (holidays / atbeds / antalya), APIX hardcoded ports, team members, IBE + internal-branding blocks |
| `20260618*`–`20260619*` | Sort-order cleanup, RAG-knowledge bucket, Confluence raw-snapshot schema, gold-set + AI-test-set tables |
| `20260620*` | Role model v2, Document Library filesystem, role-escalation guard |
| `20260621*`–`20260622*` | Presentation Hub; User Panel (profile↔team link, activity log, `profiles_v`, avatars); RLS / search-path fixes; onboarding flag |
| `20260623*`–`20260624*` | RAG foundation (company_context, retrieval function, persona v2); user-mgmt rate-limit + self-update |
| `20260625*`–`20260626*` | Data cleanup (test person, airtuerk.online, secrets audit), knowledge-base foundation, tag vocabulary, retrieval-stats job, folder colors + file Trash + presentation visibility |
| `20260627*` | Per-user folder permissions, ledger drift-repair, bucket lockdown, FK covering indexes, RLS initplan perf, `handle_new_user` lock |
| `20260628*`–`20260629*` | RAG warmup cron, RAG-write hardening, anon EXECUTE revokes, user-mgmt (title/metadata, email-change RPC), AI observability (D-107) |

## Design system

**Flat editorial minimalism.** Heavy whitespace, near-monochrome surfaces,
Quantum Blue (`#0A82DF`) as the sole functional accent — never decorative.
OS-native folder metaphors (lock-badged folder icons, Finder-style libraries),
hairline borders, sharp corners. Reads as operator software, not consumer app.

No external UI libraries (no Radix, no shadcn). Hand-rolled components throughout
— portal + focus management + roving keyboard navigation + outside-click /
Escape — built on a Tailwind 4 `@theme inline` token bridge that maps
runtime CSS custom properties to utility classes. Theme switches via a
`[data-theme]` attribute on `<html>`; no hex values are hardcoded in component
CSS. DM Mono uppercase labels, per-area BEM naming (`.dl-*` for Document
Library, `.um-*` for User Menu, etc.).

Brand-content tokens (Torch, Orient, Tiara) render brand identity inside
content blocks only — never UI chrome.

Details: `spec/DESIGN_SYSTEM.md`

## Quick start

```bash
git clone git@github.com:airtuerkmarketing/terminalv2.git
cd terminalv2
pnpm install
cp .env.example .env.local
pnpm dev
```

Real gates are `pnpm typecheck` + `pnpm build` (ESLint is not a hard gate).

## Roadmap

- **V1 launch** — production cutover (published-only CMS reads via the cookie-free
  anon path).
- **2026-08-01 demo** — CEO + CFO presentation; Wissensbasis admin UI required.
- **Remaining major block** — Phase 5 (full Admin CMS), per BUILD_LOG.
- **RAG completion** — feedback workflow, web-search activation polish, email
  notifications, and a clean n≥3 Gold-Set re-baseline.

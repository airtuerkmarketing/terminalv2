# terminalv2 — Pre-Flight Checklist

What needs to be true before Phase 1 begins.

---

## What Buhara provides

### 1. GitHub repository
- [ ] Create empty repo: `github.com/airtuerkmarketing/terminalv2`
- [ ] Make it private
- [ ] Grant Claude write access (via Claude.ai GitHub connector, or share
      a fine-grained personal access token)

### 2. Supabase organization
- [ ] Confirm target organization (default: existing org)
- [ ] Supabase MCP already accessible in this conversation

### 3. Vercel team
- [ ] Confirm target team: `airtuerk-service-gmbhs-projects`
- [ ] Vercel MCP already accessible in this conversation
- [ ] **Do not pre-create the Vercel project** — Claude does this via MCP
      after the GitHub repo exists

### 4. Local environment
- [ ] Node.js 20 LTS or 22 LTS installed (verify: `node -v`)
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Git installed
- [ ] (Optional) VS Code or another editor with TypeScript support

---

## What Claude provides

### Specification documents (in `/spec/`)

- ✅ README.md
- ✅ ARCHITECTURE.md
- ✅ DECISIONS.md (30 locked decisions, D-001 through D-030)
- ✅ SOURCE_INVENTORY.md
- ✅ PHASE_PLAN.md
- ✅ PRE_FLIGHT.md (this document)
- ✅ CONTRIBUTING.md
- ✅ BUILD_LOG.md
- ✅ .env.example

### Database migrations (in `/spec/supabase/migrations/`)

- ✅ 0001_initial_schema.sql (9 tables, types, indexes, triggers)
- ✅ 0002_rls_policies.sql (Row Level Security)
- ✅ 0003_storage_buckets.sql (4 buckets + policies)
- ✅ 0004_seed_brands.sql (8 brands)
- ✅ 0005_seed_pages.sql (56 pages with sanity check)
- ✅ 0006_profiles_trigger.sql (auto-create profile, set admin role)

### What Claude will produce in Phase 2

- `asset-manifest.json` — every file mapped to bucket + path
- `document-manifest.json` — 47 documents with full metadata
- `team-manifest.json` — 63 team members with brand assignments

User reviews and approves manifests before any file actually uploads.

---

## Critical confirmations needed from Buhara

Read these and tick:

- [ ] **D-001 through D-030 in DECISIONS.md** — all read and approved
- [ ] **Site structure** (56 pages, ARCHITECTURE.md §2) — approved
- [ ] **Block taxonomy** (15 + raw_html, ARCHITECTURE.md §4) — approved
- [ ] **Database schema** (9 tables, ARCHITECTURE.md §5 and the SQL) — approved
- [ ] **Storage buckets** (4 buckets, ARCHITECTURE.md §6) — approved

### Specific values to confirm

- [ ] **Initial admin email** for the auto-promote trigger (D-027)
      → likely `buhara@airtuerk.de` — confirm
- [ ] **Production domain** → `terminal.airtuerk.de` — confirm
- [ ] **Supabase tier** → free for v1 (D-013) — confirm
- [ ] **`/service-center` vs `/service-center-antalya`** → schema uses
      `service-center` — confirm

---

## Risk register

| Risk | Mitigation |
|---|---|
| MCP token expires mid-session | Buhara re-grants when needed |
| Supabase free tier limit hit | Upgrade to Pro inline (no data migration) |
| Asset URL changes break content | All URLs locked at upload time (D-014) |
| Block schema needs change after launch | `content` is JSONB, migrations easy |
| Vercel deploy fails | Local dev keeps working; debug in isolation |
| Identity Configurator unspecified | Mini-spec in D-025; full spec at Phase 6 |

---

## What we are NOT doing in Phase 1

- Writing application code
- Designing UI screens
- Importing content (Phase 2)
- Building admin (Phase 5)
- Setting up email sending for auth (Supabase magic links work out of box)

---

## Once everything above is ✅

We start Phase 1 with the very first MCP call:

```
list_organizations
```

…and we move through Phase 1's exit criteria one at a time.

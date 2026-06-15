# terminalv2 — Contributing & Workflow

How code flows from idea to production.

---

## Branches

| Branch | Purpose | Protected | Deploys to |
|---|---|---|---|
| `main` | Production-ready code | ✅ yes | `terminal.airtuerk.de` |
| `feature/*` | New work | no | Vercel preview URL |
| `fix/*` | Bug fixes | no | Vercel preview URL |
| `docs/*` | Documentation only | no | Vercel preview URL |

**Rules:**
- Never commit directly to `main`. Always PR.
- Branch names: lowercase, hyphen-separated, prefixed by type.
- One branch per logical change.

---

## Commits

**Format:**
```
type(scope): short description

Longer explanation if needed. Reference decisions: D-005, D-012.
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`

**Examples:**
- `feat(blocks): add product_showcase renderer`
- `fix(sidebar): correct active state for sub-pages`
- `docs(decisions): add D-027 profile creation trigger`
- `chore(deps): bump next to 15.0.3`

---

## Pull requests

Required checks before merge:
- [ ] Branch up to date with `main`
- [ ] CI green (typecheck, lint, build)
- [ ] No console errors introduced
- [ ] BUILD_LOG.md updated for phase milestones
- [ ] DECISIONS.md updated if architecture changed
- [ ] Vercel preview deployment verified working

**Merge style:** Squash and merge.

---

## Deployment

Vercel automatically:
- Every PR → preview URL (`terminalv2-git-<branch>.vercel.app`)
- Every merge to `main` → production (`terminal.airtuerk.de`)

**Rollback:** In Vercel dashboard, promote a previous deployment to
production. Never use `git revert` for emergencies — promote first, fix
later.

---

## Local development

```bash
# Clone
git clone git@github.com:airtuerkmarketing/terminalv2.git
cd terminalv2

# Install
pnpm install

# Copy env, fill from Supabase Studio
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL, INITIAL_ADMIN_EMAIL

# Generate database types from remote
pnpm db:types

# Run dev server (uses remote Supabase Frankfurt)
pnpm dev
```

`pnpm dev` connects directly to the remote Frankfurt Supabase project. No
local Docker required (D-024).

---

## pnpm scripts (defined in package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",

    "db:types": "npx supabase gen types typescript --project-id $SUPABASE_PROJECT_REF > src/types/database.ts",
    "db:diff":  "npx supabase db diff --linked --schema public",
    "db:push":  "npx supabase db push --linked",
    "db:reset": "echo 'Use Supabase Studio or migrations carefully — this would wipe data'",

    "manifest:assets":    "tsx scripts/build-asset-manifest.ts",
    "manifest:documents": "tsx scripts/build-document-manifest.ts",
    "manifest:team":      "tsx scripts/build-team-manifest.ts",

    "upload:assets":      "tsx scripts/upload-assets.ts"
  }
}
```

`$SUPABASE_PROJECT_REF` lives in `.env.local`.

---

## Database changes

All schema changes go through Supabase migrations.

**For v1 development:**
- Claude applies migrations via Supabase MCP `apply_migration`
- Buhara verifies the change in Supabase Studio
- The migration file is committed to `supabase/migrations/`

**For later (after Phase 5):**
- Optional: install Supabase CLI for local-only development
- `pnpm db:push` to apply locally-written migrations to remote
- `pnpm db:diff` to generate migrations from Studio changes

**Never:**
- Edit the database directly via Studio in production without a matching
  migration file checked in
- Skip writing a migration for a "small change"
- Modify an existing migration after it's been applied
- Mix MCP-applied and CLI-applied migrations in the same session

If a deployed migration needs change, write a new migration that supersedes
it.

---

## Asset uploads

For dev / ongoing: upload via the admin UI at `/admin/assets`.

For bulk: use scripts in `scripts/` — write to Supabase Storage AND insert
into the `assets` table in the same transaction.

**Never:**
- Upload directly to a bucket without creating an `assets` row
- Rename a file in a bucket (use new upload + delete old + update refs)
- Move a file between buckets

---

## Working with Claude

Each session:
1. Read latest `BUILD_LOG.md` to know current phase
2. Read relevant `DECISIONS.md` entries before changes
3. Update `BUILD_LOG.md` at end of meaningful work
4. New architectural decision → new `DECISIONS.md` entry

Claude has MCP connections to Supabase, Vercel, GitHub. User grants on
request, revokes when done.

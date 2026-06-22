# terminalv2 — Contributing & Workflow

How code flows from idea to production.

---

## Branches

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Working + production branch — commits land here directly | [www.airtuerk.dev](https://www.airtuerk.dev) |
| `feature/*` | Larger / parallel work (e.g. the UI-redesign branch) | Vercel preview URL |
| `fix/*` | Bug fixes (optional) | Vercel preview URL |
| `docs/*` | Documentation only (optional) | Vercel preview URL |

**Rules:**
- `main` is the working-and-deploy branch: routine work commits and pushes
  **directly to `main`**. GitHub branch protection ("changes must be made through a
  pull request") exists but is **bypassed by the repo owner** on push — that bypass is
  the intended flow today, not a violation.
- A PR-based workflow has been considered but is **not yet adopted**; until it is,
  direct-to-main stands.
- Use a `feature/*` branch only for larger or parallel work that benefits from an
  isolated preview deploy.
- Branch names: lowercase, hyphen-separated, prefixed by type.

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
- `chore(deps): bump next to 16.2.9`

---

## Pull requests

PRs are **optional** today (see Branches — routine work goes direct to `main`). When
you do open one for a `feature/*` branch, the sanity checks are:
- [ ] Branch up to date with `main`
- [ ] `pnpm typecheck` + `pnpm build` green (these are the real gates)
- [ ] No console errors introduced
- [ ] BUILD_LOG.md updated for milestones; DECISIONS.md updated if architecture changed
- [ ] Vercel preview deployment verified working

Note: `pnpm lint` is **not** a hard gate — `next build` skips ESLint, and lint is
currently red on `main` with known pre-existing findings.

**Merge style:** Squash and merge.

---

## Deployment

Vercel automatically:
- Every push to a `feature/*` branch / PR → preview URL (`terminalv2-git-<branch>.vercel.app`)
- Every push to `main` → production ([www.airtuerk.dev](https://www.airtuerk.dev))

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
# SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL

# Generate database types from remote
pnpm db:types

# Run dev server (uses remote Supabase Frankfurt)
pnpm dev
```

`pnpm dev` connects directly to the remote Frankfurt Supabase project. No
local Docker required (D-024).

**Roles / first admin:** there is no `INITIAL_ADMIN_EMAIL` step. Role assignment is
data-driven via the `user_role_defaults` table (migration 0030, D-048): the signup
trigger `handle_new_user()` reads it and stamps each new profile's role (default
`user`). To grant admin / super_admin, add or edit the email→role row in
`user_role_defaults` (super-admin-only via RLS), or change the role through the admin
User Panel.

---

## pnpm scripts (defined in package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:types": "supabase gen types typescript --project-id zkydrymygjrscjbhusxp > src/lib/database.types.ts"
  }
}
```

`db:types` writes to `src/lib/database.types.ts` and has the prod project ref
(`zkydrymygjrscjbhusxp`) hardcoded. There are no `db:diff`/`db:push`/`db:reset` or
`manifest:*`/`upload:*` scripts — one-off scripts live in `scripts/` and are run
directly (e.g. `node --env-file=.env.local scripts/seed-key-users.ts`).

---

## Database changes

All schema changes go through Supabase migrations.

**Current method:**
- Claude applies migrations via the Supabase MCP `apply_migration` **when the MCP is
  connected**; otherwise via the Management API with `SUPABASE_ACCESS_TOKEN` (the MCP
  is often not connected in a given session).
- Each applied migration is recorded in `schema_migrations` and committed to
  `supabase/migrations/`. Migration files are mixed: sequential `0001`–`0033` plus
  timestamped `20260621*`/`20260622*`.
- Prod writes need explicit user (Buhara) sign-off first.

**Never:**
- Edit the database directly via Studio in production without a matching
  migration file checked in
- Skip writing a migration for a "small change" (a direct `execute_sql` data change
  still needs a follow-up reproducibility migration — see D-056)
- Modify an existing migration after it's been applied

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

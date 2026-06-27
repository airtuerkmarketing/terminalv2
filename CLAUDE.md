# CLAUDE.md — working agreement for terminalv2

Guidance for any Claude/AI session working in this repo. Applies identically across
Claude Code Desktop, PowerShell, and any terminal — consistency comes from this
committed file, not the environment.

## Docs are derived — verify before trusting

Markdown docs (`README.md`, `spec/*.md`) drift from the real system. Treat them as
hints, not authority. Ground truth, in priority order:

1. Applied Supabase migrations in `supabase/migrations/` — the highest migration
   (timestamped names sort after the `00NN` ones) is the current schema.
2. Actual TypeScript / CSS / config source in the repo.
3. Live deployment config (Vercel project / env, live DB).

Specifically:

- **Before trusting any number or range in a doc** (page/brand/migration/bucket counts,
  `D-NNN` ranges, file inventories, status/phase, URLs), verify it against
  `supabase/migrations/` and source first.
- **Highest migration file = current schema.** The highest `D-NNN` referenced in
  migrations is the current decision count floor; `spec/DECISIONS.md` is the decision
  log (it may run a few ahead for decisions not yet tied to a migration).
- **`spec/BUILD_LOG.md` is append-only history.** The dated **Current State** block at
  the top is the only present-tense status — read it first, and never rewrite past
  entries (add new ones).
- **`spec/DECISIONS.md` is a log:** supersede entries (add a `⚠️ SUPERSEDED`/`CLOSED`
  marker + a new entry), don't rewrite point-in-time decisions.

## Keep derived docs honest in the same change

- When you change schema or a decision, **update the derived docs in the same change.**
  A change that adds a migration but leaves counts/ranges stale is incomplete.
- Update the highest `D-NNN` and the highest migration number everywhere they appear
  (README migration table, ARCHITECTURE §7/§8/§10, BUILD_LOG Current State).
- A direct `execute_sql` **schema/DDL** change must ship a companion migration **in the
  same commit**, registered through the migration system (`apply_migration`/`db push`, not
  raw `execute_sql`), so `supabase/migrations/` stays in exact parity with the
  `schema_migrations` registry. Ledger drift here is what D-081 had to repair — don't
  recreate it. A data-only `execute_sql` change still needs a follow-up reproducibility
  migration (see D-056).

## Workflow notes

- `main` is the working-and-deploy branch — routine work commits/pushes directly to
  `main` (owner bypasses branch protection). PRs are optional, for larger/parallel work.
- Real gates are `pnpm typecheck` + `pnpm build`. `pnpm lint` is **not** a hard gate
  (`next build` skips ESLint; lint is currently red with known pre-existing findings).
- Migrations apply via the Supabase MCP `apply_migration` when connected, else via the
  Management API with `SUPABASE_ACCESS_TOKEN`. Prod writes need explicit user sign-off.

See `spec/CONTRIBUTING.md` for the full workflow and `spec/ARCHITECTURE.md` for the
canonical system design.

## Preview Test Account

See `CLAUDE.local.md` (gitignored) for credentials.

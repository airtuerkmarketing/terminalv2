# CLAUDE.md — working agreement for terminalv2

Guidance for any Claude/AI session working in this repo. Applies identically across
Claude Code Desktop, PowerShell, and any terminal — consistency comes from this
committed file, not the environment.

## Production surface (snapshot 2026-06-30)

Point-in-time orientation only — **verify against `supabase/migrations/` +
`spec/BUILD_LOG.md` before trusting** (per the rule below):

- **HEAD:** `3dee708` on `main` (the working + deploy branch).
- **App:** Vercel **fra1** (Node 24.x, Turbopack) → **https://terminal.airtuerk.ai** (repo public).
- **Supabase:** `zkydrymygjrscjbhusxp`, eu-central-1, Postgres 17.6.1, Pro.
- **Migrations:** 87 (latest `20260630120000_gold_set_eval_modes`).
- **Edge functions (9):** `rag-query` v20 · `embed-knowledge` v14 · `notify-correction-event` v7 ·
  `notify-folder-access` v7 · `notify-password-changed` v2 · `tag-classify-chunks` v3 ·
  `confluence-snapshot` v10 · `confluence-extend`/`confluence-extract-text` v9.
- **Highest decision:** D-113 (`spec/DECISIONS.md`; D-108–D-113 DRAFT, awaiting ratification).

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
- Any schema/DDL change must ship a committed migration file **in the same commit** AND be
  registered in `supabase_migrations.schema_migrations` under a **matching version** — via
  `apply_migration`/`db push`, or (as the D-081 drift-repair + D-082 hardening did) via
  `execute_sql` plus an explicit registry row at a controlled version (the MCP
  `apply_migration` auto-timestamps, which can mis-order or drift). `supabase/migrations/`
  must stay in exact parity with the registry — verify by **hashing the sorted version set,
  not by counting** (counts can match while the sets differ). Ledger drift is what D-081 had
  to repair — don't recreate it. A data-only `execute_sql` change still needs a follow-up
  reproducibility migration (see D-056).

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

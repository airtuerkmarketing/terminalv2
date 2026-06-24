# Ledger-Drift Recon — AP 5, Stufe A (analysis only)

**Date:** 2026-06-24
**Mode:** READ-ONLY. No migrations, no DB writes, no code changes other than this file.
**Goal:** For each of the 8 drift points, answer precisely: *"Is the file's / entry's effect
actually applied in production, or not?"* — then propose a reconciliation plan for Stufe B.

**Sources:** local files under `supabase/migrations/`; live DB (`zkydrymygjrscjbhusxp`) via Supabase
MCP `execute_sql` over `pages`, `blocks`, `storage.buckets`, `pg_policies`, `auth.users`,
`supabase_migrations.schema_migrations`.

**Baseline counts:** local `.sql` files = **53**, DB ledger entries = **52**.

> ⚠️ **Broader context (read before Stufe B) — OFFEN for Buhara:** the entire numbered series
> `0001`–`0033` is recorded in the ledger under **timestamp** versions with the prefix stripped
> (e.g. `0001_initial_schema` → ledger `20260615153912 initial_schema`), **not** under `00NN`.
> They match **by name**, but a `supabase db push`/`migration list` keys on **version**, so it would
> treat *every* `00NN` file as "not applied". **Reconciling the 8 points below does NOT by itself
> make `supabase db push` reliable** — the `00NN → timestamp` rename of all 33 numbered files is a
> larger, separate cleanup. Recommendation: scope this AP to the 8 points; track the `00NN` rename
> as a follow-up AP. See also [[migration-ledger-drift]], [[supabase-migration-apply-method]].

---

## A1 — The 4 local-only files (file exists, no ledger entry)

### 1. `0014_apix_network_hardcoded.sql`
- **What it does:** `UPDATE pages SET rendering_mode='hardcoded', component_key='apix-network'
  WHERE full_path='/airtuerk-apix/global-network'`. Idempotent.
- **DB verify** (`SELECT … FROM pages WHERE full_path='/airtuerk-apix/global-network'`):
  `rendering_mode='hardcoded'`, `component_key='apix-network'`, `status='published'`.
- **Conclusion: ✅ EFFECT IN DB SICHTBAR — applied, only the ledger row is missing.**

### 2. `0015_apix_presentation_hardcoded.sql`
- **What it does:** `UPDATE pages SET rendering_mode='hardcoded', component_key='apix-presentation'
  WHERE full_path='/airtuerk-apix/presentation'`. Idempotent.
- **DB verify:** `rendering_mode='hardcoded'`, `component_key='apix-presentation'`, `status='published'`.
- **Conclusion: ✅ EFFECT IN DB SICHTBAR — applied, ledger row missing.**

### 3. `0016_apix_group_structure_page.sql`
- **What it does:** `INSERT INTO pages (… '/airtuerk-apix/group-structure' … 'apix-group' … status='draft')
  … ON CONFLICT (full_path) DO UPDATE SET rendering_mode='hardcoded', component_key='apix-group'`.
- **DB verify:** row `/airtuerk-apix/group-structure` exists, `rendering_mode='hardcoded'`,
  `component_key='apix-group'`, `sort_order=35`, **`status='published'`** (file seeds `'draft'`; the
  page was published later — effect present, a later status flip diverges from the file but is harmless).
- **Conclusion: ✅ EFFECT IN DB SICHTBAR — applied, ledger row missing.** (Minor: status drifted draft→published.)

### 4. `20260622120000_remove_internal_branding_configurator.sql`
- **What it does:** `DELETE FROM public.pages WHERE full_path='/internal-branding/configurator'`.
  File header states it was already deleted live via `execute_sql`; the migration makes it reproducible.
- **DB verify** (`SELECT … WHERE full_path='/internal-branding/configurator'`): **`null` (no row)**.
- **Conclusion: ✅ EFFECT IN DB SICHTBAR (page absent = DELETE applied) — ledger row missing.**

**A1 summary:** all 4 files are **already applied**; only the ledger bookkeeping is missing. Each
uses idempotent SQL, so recording them (or even re-running) is safe.

---

## A2 — The 3 DB-only entries (ledger entry exists, no local file)

All three have **non-NULL `statements`** in the ledger (fully recoverable — no reconstruction guessing needed).

### 1. `20260617220906 seed_internal_branding_applied_fix_iphone_path`
- **Statements (recovered):** `DELETE FROM blocks` (description + logo_grid) for
  `/internal-branding/applied-identity`, then `INSERT` a `description` block (pos 0) + a `logo_grid`
  block (pos 1) with 6 product-shot tiles incl. the iPhone Mockup.
- **DB verify** (`blocks` JOIN `pages` on `/internal-branding/applied-identity`): exactly a
  `description` (pos 0) + `logo_grid` (pos 1, iPhone Mockup present). Matches.
- **Conclusion: ✅ applied; statements fully recoverable → can be written out as a local file verbatim.**

### 2. `20260618143011 create_rag_knowledge_bucket`
- **Statements (recovered):** `INSERT INTO storage.buckets ('rag-knowledge', private, 50 MB, mime
  allowlist) ON CONFLICT (id) DO NOTHING`.
- **DB verify** (`storage.buckets WHERE id='rag-knowledge'`): exists, `public=false`,
  `file_size_limit=52428800`. Matches.
- **Conclusion: ✅ applied; statements fully recoverable → write out as a local file verbatim.**

### 3. `20260618143026 rag_knowledge_bucket_policies`
- **Statements (recovered):** 4 × `CREATE POLICY` on `storage.objects` for `bucket_id='rag-knowledge'`
  (insert/select/update/delete, role `authenticated`).
- **DB verify** (`pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE
  'rag_knowledge%'`): all 4 present (`rag_knowledge_auth_{insert,select,update,delete}`). Matches.
- **Conclusion: ✅ applied; statements fully recoverable → write out as a local file verbatim.**

**A2 summary:** all 3 entries are applied **and** their SQL is preserved in `schema_migrations.statements`,
so local files can be regenerated **exactly** (md5-verifiable per [[supabase-migration-apply-method]]) —
no `-- RECONSTRUCTED` guessing required.

---

## A3 — The version-mismatch

### `seed_force_password_change_flag`
- **Local file:** `20260622150000_seed_force_password_change_flag.sql`
- **DB version:** `20260622105118`
- **Statement comparison:** the DB `statements` text is **character-identical** to the local file
  (same header comments, same `UPDATE auth.users … WHERE email IN (aoezbek, utenekeci, hakan, msinim,
  odemir, tsahin)`, same verify `DO $$` block). **IDENTICAL — only the version id differs.**
- **Conclusion:** safe to **rename the local file** `20260622150000_*` → `20260622105118_*` to match the ledger.
- **Context note (not a ledger issue):** today **0 users** carry `force_password_change=true` — the 6
  target accounts don't exist in current prod (only `dev@`, `bdemir@`, `eerkara@` have auth rows). This
  confirms the "9-key seed never persisted to current prod" finding ([[user-mgmt-recon]]); it does **not**
  affect the rename (statements match regardless of how many rows the UPDATE touched).

---

## A4 — Reconciliation plan

### Per-point recommendation

| # | Drift point | Recommended action | Risk | Reversible? |
|---|---|---|---|---|
| 1 | `0014_apix_network_hardcoded` | Record in ledger (`INSERT INTO schema_migrations` with recovered statements) + rename local file to the chosen timestamp | LOW (idempotent UPDATE) | YES — `DELETE FROM schema_migrations WHERE version=…` + rename back |
| 2 | `0015_apix_presentation_hardcoded` | same as #1 | LOW | YES |
| 3 | `0016_apix_group_structure_page` | same as #1 (note status draft→published already diverged; effect intact) | LOW | YES |
| 4 | `20260622120000_remove_internal_branding_configurator` | Record in ledger (`INSERT`, version `20260622120000` = file's own timestamp; **no rename needed**) | LOW (DELETE already applied) | YES — `DELETE FROM schema_migrations WHERE version='20260622120000'` |
| 5 | `20260617220906 fix_iphone_path` (DB-only) | Write local file `20260617220906_seed_internal_branding_applied_fix_iphone_path.sql` from recovered statements | LOW (file add only, no DB change) | YES — delete the file |
| 6 | `20260618143011 create_rag_knowledge_bucket` (DB-only) | Write local file from recovered statements | LOW (file add only) | YES — delete the file |
| 7 | `20260618143026 rag_knowledge_bucket_policies` (DB-only) | Write local file from recovered statements | LOW (file add only) | YES — delete the file |
| 8 | `seed_force_password_change_flag` (mismatch) | Rename local `20260622150000_*` → `20260622105118_*` (statements identical) | LOW (file rename only) | YES — rename back |

### OFFEN — needs Buhara's decision before Stufe B
- **Version ids for points 1–3.** The `00NN` prefixes are not valid ledger timestamps and would sort
  ahead of every timestamp (breaking order). Proposed: slot timestamps **between** the neighbors
  `20260617060854` (0013 seed_holidays) and `20260617150357` (0017) — e.g.
  `20260617060901 / 20260617060902 / 20260617060903`. These are **invented** timestamps (chosen only
  to preserve ordering). Confirm this convention, or prefer `supabase migration repair` semantics.
- **Scope.** Confirm we fix only these 8 and defer the broader `00NN → timestamp` rename (33 files) to
  a follow-up AP (see the ⚠️ note at the top).

### Proposed Stufe-B step order (one action → one verify → one commit each)
1. **#5–#7 first** (write 3 local files from recovered statements). Safest — adds files only, zero DB
   change; immediately closes the DB-only gap. Verify: files exist + md5 of content matches
   `schema_migrations.statements`.
2. **#8** (rename force_password local file to `20260622105118_*`). Verify: no remaining `20260622150000` file.
3. **#4** (ledger INSERT for configurator removal, version `20260622120000`). Verify: row present; page still absent.
4. **#1–#3** (ledger INSERT + local rename for the 3 APIX files, using the confirmed timestamps).
   Verify after each: row present; page row still has the expected `component_key`.
5. **Final verify:** local file count == ledger count (expected **56 == 56**); re-run the per-point
   verify queries; confirm no unexpected ledger rows. Final commit `chore(ledger): drift cleanup complete`.

**Post-reconcile count math:** start local 53 / DB 52 → +3 DB rows (#1–3) +1 DB row (#4) → DB 56;
+3 local files (#5–7) → local 56. Renames (#1–3, #8) don't change counts. **Result: 56 == 56.**

### Risk posture
- All 8 actions are **LOW risk** and individually reversible. No action changes live application data:
  the APIX pages, the configurator deletion, the rag bucket/policies, and the applied-identity blocks
  are **already** in their target state — Stufe B only reconciles **bookkeeping** (ledger rows + file
  names), not behavior.
- `main` is prod-live: every `INSERT INTO schema_migrations` will be double-checked (version unique,
  statements md5-matched) before execution, per [[main-merge-protocol]].

---

## Status
**Stufe A complete. 8 / 8 drift points classified (all "applied — bookkeeping only").
2 OFFEN decisions for Buhara (version-id convention for #1–3; scope confirmation). No fixes executed.**

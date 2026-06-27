# HEALTH_CHECK — terminalv2 — 2026-06-27

**Project:** `terminalv2` / `zkydrymygjrscjbhusxp` · PG 17.6.1 · eu-central-1 · `ACTIVE_HEALTHY`
**Conducted by:** Claude Code Desktop (Phase B Deep Check) + Hauptchat reconciliation (Phase A1 Drift-Recon)
**Verdict:** 🟢 **GO** for the 2026-08-01 demo. No 🔴 blockers. Every 🟡 finding is reproducibility/hardening debt that does not affect the live demo.

> All live counts in this document were re-verified against the live DB via Supabase MCP on 2026-06-27 (see "Live counts"). Edge-function parity verified by per-function source diff. Read-only audit — no writes performed against prod during the check.

## Section overview

| # | Section | Status | Headline |
|---|---|---|---|
| 1 | Migration reproducibility | 🟡 | Live schema correct, **ledger drift**: 5 recent migrations applied-but-unregistered + 30 legacy `00NN` files keyed under timestamps. `db push` unreliable; demo unaffected. |
| 2 | Edge-function drift | 🟢 | 8/8 deployed = repo source, **byte-identical**, versions match. |
| 3 | Build / Types | 🟢 | `typecheck` 0 errors, `build` 0 errors (Next 16.2.9 Turbopack, 5.4s, 11/11 static pages). |
| 4 | Latency (hot paths) | 🟢/🟡 | Public routes fast (login p50 ≈ 210ms, p95 ≈ 370ms). Auth'd RAG/folder-tree **not measured** (need session). |
| 5 | RLS initplan perf | 🟡 | 8 policies use bare `auth.uid()` — all on tiny per-user tables. Negligible at demo scale. |
| 6 | FK index coverage | 🟡 | 26 unindexed FKs. Demo-scale negligible. |
| 7 | SECURITY DEFINER | 🟡 | 12 SECDEF fns; **9 executable by anon/PUBLIC**. Info-leak surface, not data leak. |
| 8 | Storage buckets | 🟢/🟡 | Limits+mime set, scoped. `documents` bucket is **public but empty** (latent); `rag-knowledge` write open to any authenticated. |
| 9 | Cron health | 🟢 | 3 active jobs, **all last runs succeeded** (03:15/03:30/03:45). |
| 10 | Auth settings | 🟡 | Auth `db_connections` pinned **absolute 10** (advisor flag). Rest needs dashboard. |

**Advisors:** Security = 0 ERROR / 24 WARN. Performance = 83 lints (59 INFO / 24 WARN). No ERROR-level anywhere.

---

## §1 — Migration reproducibility 🟡 (the one real debt)

The **live schema is current and correct** — every column/table/function/policy referenced by the 5 "missing" migrations has been verified to exist on prod (Phase A pre-verify 2026-06-27: all 8 schema markers `true`). The drift is purely in the *ledger* (`supabase_migrations.schema_migrations`), which breaks `db push`/fresh-rebuild but **not the running demo**.

Three distinct problems:

1. **5 migration files applied to schema but NOT in the ledger** (Phase A1: 0 rows registered for these 5 versions):
   - `20260626170000_document_folders_color` — `document_folders.color text` ✓
   - `20260626180000_document_files_trash` — `document_files.deleted_at/deleted_by` + indexes + purge fn + cron ✓
   - `20260626190000_presentation_folders_color` — `presentation_folders.color text` ✓
   - `20260626200000_presentation_files_trash` — `presentation_files.deleted_at/deleted_by` + indexes + purge fn + cron ✓
   - `20260626210000_presentation_folder_visibility` — `presentation_folders.is_public` + `presentation_folders_select` / `presentation_files_select` RLS policies ✓

2. **Legacy `00NN` vs timestamp keying** (30 files): repo `0001…0033_*.sql` are recorded in the ledger under *timestamp* versions (e.g. `20260615153912` = `initial_schema`). `supabase migration list` therefore shows local `00NN` as "pending" and remote timestamps as "remote-only" → a `db push` would try to re-apply already-applied DDL. Two entries keep their numeric prefix in the registered `name` (`20260617150357 = 0017_resort_signature_after_letterhead`, `20260621072952 = 0033_presentation_hub`).

3. **`knowledge_base_foundation` timestamp mismatch:** repo `20260625190000` vs ledger `20260625200810` (same name, different version).

**Note:** `20260627090000_folder_permissions` IS registered and fully applied — `can_*_folder` functions exist on prod, both `*_folder_permissions` tables exist, RLS policies in place.

**Decision:** reconcile now (full system-wide, not demo-gated). See `LEDGER_RECONCILE_PLAN_2026-06-27.md` for the verify-then-backfill approach: drift-repair INSERT for the 5 + 30 `git mv` renames + kb rename. Schema-side NoOp, reversible.

---

## §2 — Edge-function drift 🟢

All 8 functions: deployed source **byte-identical** to repo (verified by per-function source diff), versions exactly as expected.

| Slug | Live | verify_jwt |
|---|---|---|
| confluence-snapshot | v8 | ✅ |
| confluence-extend | v7 | ✅ |
| confluence-extract-text | v7 | ✅ |
| embed-knowledge | v12 | ✅ |
| rag-query | v12 | ✅ |
| notify-correction-event | v2 | ✅ |
| tag-classify-chunks | v1 | ✅ |
| notify-folder-access | v1 | ✅ |

**No redeploy needed.**

---

## §3 — Build / Types 🟢

`TYPECHECK_EXIT=0`, `BUILD_EXIT=0`. Next.js 16.2.9 Turbopack, compiled 5.4s, 11/11 static pages. Routes are all server-rendered (`ƒ`): `/`, `/[...slug]`, `/documents-library/[[...folder]]`, `/presentation-hub/[[...folder]]`, `/login` (+forgot/update-password), `/admin`, `/admin/knowledge`, `/admin/users`, `/account/profile`, `/auth/confirm`, `/api/{search,library/file/[id],presentations/file/[id]}`.

⚠️ **Bundle-size targets cannot be checked** — Turbopack production builds don't emit the per-route First-Load-JS table. Also there is **no `/ask-ai` route** (AI chat lives on `/`); the Phase-B checklist's route list was partly hypothetical. For real bundle numbers, run `@next/bundle-analyzer`.

---

## §4 — Latency 🟢/🟡

Live probe (8 sequential, prod `www.airtuerk.dev`):

| Route | Method | p50 | p95 | Verdict |
|---|---|---|---|---|
| `/login` | GET | 0.21s | 0.37s | ✅ well under 800ms |
| `/` | GET | 0.51s | 0.59s | ✅ (307 redirect to login) |
| `POST /auth/login` | POST | — | — | not measured (needs cred) |
| `rag-query` edge fn | POST | — | — | not measured (needs auth) |
| Folder-tree | GET | — | — | not measured (needs auth) |
| Signed-URL | GET | — | — | not measured (needs auth) |

Recommend a 10-request incognito pass post-deploy. Edge cold-start: expect +1–2s on first RAG call after idle.

---

## §5 — RLS initplan 🟡

Exactly **8** policies use bare `auth.uid()` / role fns without `(SELECT …)` wrapping:

| Table | Policies |
|---|---|
| `ai_chat_sessions` | sessions_own_select, sessions_own_insert, sessions_own_update |
| `ai_chat_messages` | messages_own_select, messages_own_feedback_update |
| `ai_corrections` | corrections_own_select, corrections_own_insert |
| `team_members` | team_self_update |

All small per-user tables → negligible at demo scale. Template fix exists: `20260621161007_rls_auth_uid_initplan_fix.sql`. **fix-after-demo.**

---

## §6 — FK index coverage 🟡

**26** FKs without a covering index (advisor confirmed). Spread:
- `ai_corrections` (3)
- `tag_vocabulary` (3)
- `tag_suggestions` (2)
- `chunk_edit_log` (2)
- `document_files` (2)
- `presentation_files` (2)
- folder/permissions tables (`document_folder_permissions`, `presentation_folder_permissions`, `document_folders`, `presentation_folders`)
- `documents` (2), `brands`, `pages`, `team_members`, `company_context`, `brand_chunks` (2)

Single `CREATE INDEX IF NOT EXISTS` migration covers all. **fix-after-demo** (none of these are demo hot-paths at scale).

---

## §7 — SECURITY DEFINER 🟡

12 SECDEF functions; **9 carry a PUBLIC (`=X`) execute grant** → callable by `anon`:

| Function | Risk | Action |
|---|---|---|
| `is_admin()` | Info-leak (boolean) | REVOKE FROM anon, PUBLIC — keep authenticated |
| `is_super_admin()` | Info-leak (boolean) | REVOKE FROM anon, PUBLIC — keep authenticated |
| `get_profile_role(uuid)` | Info-leak (role) | REVOKE FROM anon, PUBLIC — keep authenticated |
| `current_team_member_id()` | Info-leak (uuid) | REVOKE FROM anon, PUBLIC — keep authenticated |
| `can_access_document_folder(uuid)` | Visibility-probe by UUID | REVOKE FROM anon, PUBLIC — keep authenticated |
| `can_access_presentation_folder(uuid)` | Visibility-probe by UUID | REVOKE FROM anon, PUBLIC — keep authenticated |
| `can_see_document_folder(uuid)` | Visibility-probe by UUID | REVOKE FROM anon, PUBLIC — keep authenticated |
| `can_see_presentation_folder(uuid)` | Visibility-probe by UUID | REVOKE FROM anon, PUBLIC — keep authenticated |
| `handle_new_user()` | Trigger fn — should NOT be RPC-exposed | REVOKE FROM all (incl. authenticated) |

The 3 cron fns (`purge_expired_trashed_documents`, `purge_expired_trashed_presentations`, `refresh_chunk_retrieval_stats`) are correctly locked to `postgres`/`service_role` ✓. All have `search_path` pinned ✓.

Risk is **info-leak, not data-leak** (booleans / folder-visibility probes by UUID, no row data exposure).

→ See `SECDEF_REVOKE_TEST_PLAN.md` for test cases before apply. **fix-after-demo** (defense-in-depth).

---

## §8 — Storage 🟢/🟡

9 buckets, all with size limits + mime restrictions. Scoping mostly sound (writes admin-only; `library`/`presentations` read admin-only since users get server-signed URLs). Object counts verified live 2026-06-27:

| Bucket | Public | Objects | Notes |
|---|---|---|---|
| `images` | public | 762 | brand/site assets — by design |
| `confluence-attachments` | private | 116 | readable by any authenticated — **intended** (staff KB) |
| `library` | private | 6 | Document Library — read admin-only (users get signed URLs) ✓ |
| `avatars` | public | 6 | profile avatars — by design |
| `videos` | public | 4 | public media — by design |
| `rag-knowledge` | private | 1 | 🟡 any authenticated can INSERT/UPDATE/**DELETE** — should be admin-only |
| `documents` | **public=true** | 0 | 🟡 legacy/unused bucket, latent world-read risk — drop or set private |
| `presentations` | private | 0 | Presentation Hub — read admin-only ✓ |
| `fonts` | public | 0 | self-host fonts — by design |
| **Total** | | **895** | |

**fix-after-demo** (zero exposure today but cleanup recommended).

---

## §9 — Cron 🟢

3 active jobs, all green on last run:

| Job | Schedule | Last Status |
|---|---|---|
| `refresh-chunk-retrieval-stats` | `15 3 * * *` | ✅ succeeded |
| `purge-expired-trashed-documents` | `30 3 * * *` | ✅ succeeded |
| `purge-expired-trashed-presentations` | `45 3 * * *` | ✅ succeeded |

History is short (jobs created recently) but clean.

---

## §10 — Auth 🟡

Advisor flags **`auth_db_connections_absolute`**: Auth server pinned to max **10 connections** (absolute, not percentage). Fine for a small demo, but concurrent logins during a live demo could bottleneck.

→ **Fix in Supabase Dashboard:** Settings → Auth → DB Connections → switch to percentage-based.

The rest (SMTP/magic-link, OAuth, JWT expiry, rate limits) needs the Supabase **dashboard** — not accessible via MCP. Manual check needed before demo.

---

## ℹ️ Perf INFO (no demo action)

- **32 `unused_index`** — mostly new-feature indexes never yet queried. **Do not drop pre-launch** (no traffic baseline yet).
- **16 `multiple_permissive_policies`** — minor planner cost, mostly by-design (admin-override pattern).
- **2 `extension_in_public`** (`pg_trgm`, `vector`) — cosmetic, Supabase default.
- **1 `gold_set_answers_insert_public`** — anon `INSERT` `WITH CHECK(true)` open-write endpoint. Quiz UI was removed but table/policy linger → **spam vector**, trivial to drop.

---

## Live counts (snapshot 2026-06-27, verified via Supabase MCP)

| Metric | Value |
|---|---|
| public Tables | 34 |
| public Views | 1 |
| public Functions | 167 |
| public Indexes | 139 |
| RLS Policies | 89 |
| Cron Jobs | 3 |
| Storage Buckets | 9 |
| Storage Objects | 895 |
| Auth Users | 4 |
| DB Size | 28 MB |
| Edge Functions | 8 ACTIVE |
| Registered Migrations | 69 → 75 after ledger reconcile (5 backfilled + 1 repair migration; 30 `00NN` renames don't change the count) |

---

## Go / No-Go

**🟢 GO.** Zero blockers. Live DB is current, **34/34 public tables RLS-enabled with policies (no coverage gaps)**, build/types green, edge functions un-drifted, cron healthy, public latency strong. Every issue is post-demo debt.

## Recommended order (system-wide)

| Order | Item | When | Reference |
|---|---|---|---|
| 1 | Reconcile migration ledger (5 INSERT + 30 `00NN`→timestamp + kb rename) | now | `LEDGER_RECONCILE_PLAN_2026-06-27.md` |
| 2 | Doc-refresh (BUILD_LOG, SOURCE_INVENTORY, DECISIONS D-NNN, CLAUDE.md guardrail) | now | this report + reconcile plan |
| 3 | `REVOKE` SECDEF execute from `anon`/`PUBLIC` + lock `handle_new_user` + drop `gold_set_answers` public-INSERT policy | post-demo | `SECDEF_REVOKE_TEST_PLAN.md` |
| 4 | Single FK-index migration (26) + 8 RLS-initplan rewrites | post-demo | TBD draft |
| 5 | `documents` bucket → private/remove; tighten `rag-knowledge` writes to admin | post-demo | `SECDEF_REVOKE_TEST_PLAN.md` §related |
| 6 | Auth DB connections → percentage (dashboard); authenticated-path latency probe | post-demo | manual + scripted |

---

*Generated 2026-06-27 by Claude Code Desktop (Phase B) + Hauptchat (Phase A1 reconciliation). Read-only audit. No writes performed against prod during the check. Live counts re-verified via Supabase MCP.*

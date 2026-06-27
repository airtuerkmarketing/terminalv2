# SECDEF_REVOKE_TEST_PLAN — 2026-06-27

> **Status (2026-06-27):** Post-demo work (per the demo plan). The migration-ledger
> reconcile (D-081) is **done**; this plan covers the separate SECDEF hardening. The
> policy→helper counts below (e.g. "is_admin() — 45 policies") were stated during
> planning — the plan's own **Phase A re-verifies them against `pg_policies`** before any
> REVOKE, which is the binding source of truth. Do **not** ship the REVOKE migration until
> the section-by-section test matrix passes.

**Scope:** Test which RLS-protected paths must continue to work after `REVOKE EXECUTE … FROM anon, PUBLIC` on 9 SECURITY DEFINER helpers, and which paths should newly return permission denied.
**Owner:** Claude Code Desktop (execute against prod with `super_admin` test session — read-only baseline, then prod migration).
**Risk if wrong:** RLS policies break → users see empty results or 403s on legitimate paths.
**Hard rule:** Run **all baseline tests + all post-REVOKE tests pass** before committing the REVOKE migration.

---

## Why REVOKE works in theory

Inside an RLS `USING`/`WITH CHECK` clause, helper-function calls execute in the **caller's role context** for the permission check (EXECUTE grant), even though the function body runs as DEFINER. So:

- `authenticated` role needs `EXECUTE` on these helpers, otherwise RLS evaluation throws `permission denied`.
- `anon` role does NOT need `EXECUTE` for any RLS path (no policies reference these helpers for anon).
- `PUBLIC` is the default role; revoking from PUBLIC and keeping `authenticated` explicitly is the cleanest grant.

**Tested empirically below** — theory ≠ runtime in Postgres SECDEF + RLS edge cases. Don't ship the REVOKE without the test pass.

---

## The 9 helpers + their RLS footprint

Verified live 2026-06-27 against `pg_policies`:

| Helper | RLS policies that reference it | Test scope |
|---|---|---|
| `is_admin()` | 45 policies across 21 tables | every table in §1 below |
| `is_super_admin()` | 23 policies across 12 tables | every super-admin path in §2 |
| `get_profile_role(uuid)` | 2 (profiles_update_admin, profiles_update_own) | §3 — profile update |
| `current_team_member_id()` | 2 (doc/presentation_folder_permissions_select) | §4 — folder permission lookup |
| `can_access_document_folder(uuid)` | 1 (document_files.document_files_select) | §5 — doc-library read |
| `can_access_presentation_folder(uuid)` | 1 (presentation_files.presentation_files_select) | §5 — presentation read |
| `can_see_document_folder(uuid)` | 1 (document_folders.document_folders_select) | §5 — doc-library tree visibility |
| `can_see_presentation_folder(uuid)` | 1 (presentation_folders.presentation_folders_select) | §5 — presentation tree visibility |
| `handle_new_user()` | 0 (trigger only — see §6) | §6 — auth-signup trigger path |

---

## Test users needed

Use existing prod users — no fixture creation (avoids fixture cleanup blast-radius). Identify three real auth.user uuids:

```sql
-- Pre-test: identify the 3 test personas (run as service_role)
SELECT u.id, u.email, p.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY p.role NULLS LAST, u.email;
```

Map result to:
- `$SUPER_UUID` — Buhara's account (super_admin)
- `$ADMIN_UUID` — one of Oruc/Tim (admin)
- `$AUTH_UUID` — pick the 4th non-admin user OR temporarily promote/demote a known team_member who has a profile row

If there is no non-admin auth.user, **create one for the test only**:

```sql
-- TEST FIXTURE (DELETE AT END)
DO $$
DECLARE new_uid uuid;
BEGIN
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES (gen_random_uuid(), 'secdef-test@airtuerk.de', now(), '{"test":true}')
  RETURNING id INTO new_uid;
  
  -- handle_new_user trigger creates the profile row automatically
  -- but make sure role is 'member' (non-admin)
  UPDATE public.profiles SET role='member' WHERE id=new_uid;
  
  RAISE NOTICE 'Test auth_uid: %', new_uid;
END $$;
```

**Cleanup at end (mandatory):** `DELETE FROM auth.users WHERE email='secdef-test@airtuerk.de';`

---

## Test method — Postgres SET ROLE + jwt.claims

In a single psql session against prod, simulate each role by setting `role` + `request.jwt.claims`. Postgres + Supabase RLS will honor this exactly as a real HTTP request would.

```sql
-- Template (run inside BEGIN/ROLLBACK so nothing commits accidentally)
BEGIN;
  SET LOCAL role authenticated;
  SET LOCAL request.jwt.claims = format(
    '{"sub":"%s","role":"authenticated","aud":"authenticated"}',
    '$AUTH_UUID'
  )::text;
  
  -- the actual test query
  SELECT count(*) FROM public.document_folders;
ROLLBACK;
```

---

## §1 — is_admin() paths (45 policies)

**Baseline (Pre-REVOKE)** — record actual counts as `$BASELINE_*`:

```sql
-- ADMIN user — should see admin-restricted rows
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$ADMIN_UUID')::text;
SELECT 'admin_pages_count' AS scope, count(*) FROM public.pages;
SELECT 'admin_blocks_count', count(*) FROM public.blocks;
SELECT 'admin_documents_count', count(*) FROM public.documents;
SELECT 'admin_assets_count', count(*) FROM public.assets;
SELECT 'admin_brands_count', count(*) FROM public.brands;
SELECT 'admin_settings_count', count(*) FROM public.settings;
SELECT 'admin_team_count', count(*) FROM public.team_members;
SELECT 'admin_user_activity_count', count(*) FROM public.user_activity_log;
-- ... etc for all 21 tables

-- NON-ADMIN user — should see published-only / own-only
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$AUTH_UUID')::text;
SELECT 'auth_pages_count', count(*) FROM public.pages;  -- expect fewer than admin
SELECT 'auth_assets_count', count(*) FROM public.assets;  -- expect fewer than admin
-- ... etc
```

**Apply REVOKE** (single tx for atomicity):

```sql
-- Don't commit yet — set up rollback safety
BEGIN;
  REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
```

**Post-REVOKE Re-Test** — same queries, same counts must return:

```sql
  -- ADMIN user (still inside the same uncommitted tx)
  SET LOCAL role authenticated;
  SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$ADMIN_UUID')::text;
  SELECT 'POSTREVOKE_admin_pages', count(*) FROM public.pages;  -- MUST = $BASELINE_admin_pages
  -- ... etc
  
  -- If ALL match: COMMIT;
  -- If ANY mismatch: ROLLBACK; investigate.
```

**anon negative test** (separate session AFTER commit):

```sql
SET LOCAL role anon;
SELECT public.is_admin();  -- MUST throw: ERROR 42501: permission denied for function is_admin
```

---

## §2 — is_super_admin() paths (23 policies)

Same pattern, focusing on super-admin-only tables:

```sql
-- SUPER_ADMIN user — should see super-admin-only rows
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$SUPER_UUID')::text;
SELECT 'super_chunk_log_count', count(*) FROM public.chunk_edit_log;
SELECT 'super_chunk_stats_count', count(*) FROM public.chunk_retrieval_stats;
SELECT 'super_tag_vocab_count', count(*) FROM public.tag_vocabulary;
SELECT 'super_tag_sug_count', count(*) FROM public.tag_suggestions;
SELECT 'super_user_role_defaults_count', count(*) FROM public.user_role_defaults;
SELECT 'super_activity_all_count', count(*) FROM public.user_activity_log;
SELECT 'super_folder_perm_count', count(*) FROM public.document_folder_permissions;

-- REGULAR ADMIN — should NOT see super-admin-only chunk_edit_log
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$ADMIN_UUID')::text;
SELECT 'admin_chunk_log_count', count(*) FROM public.chunk_edit_log;  -- expect 0
```

After `REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, PUBLIC;` — re-run, expect identical counts.

---

## §3 — get_profile_role() — profile update path

This is the trickiest because both `profiles_update_admin` AND `profiles_update_own` reference it. Test:

```sql
-- BASELINE: admin updates ANY profile
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$ADMIN_UUID')::text;
UPDATE public.profiles SET updated_at=now() WHERE id='$AUTH_UUID';  -- expect: 1 row affected

-- BASELINE: user updates OWN profile
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$AUTH_UUID')::text;
UPDATE public.profiles SET updated_at=now() WHERE id='$AUTH_UUID';  -- expect: 1 row

-- BASELINE: user CANNOT update someone else's profile
UPDATE public.profiles SET updated_at=now() WHERE id='$ADMIN_UUID';  -- expect: 0 rows
```

After `REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM anon, PUBLIC;` — repeat exactly. Each result must match baseline.

⚠️ **Watch for:** profile role escalation guard (D-032 / `20260620020000_profiles_role_escalation_guard`). Don't accidentally test by SETTING role='admin' — that's blocked by trigger.

---

## §4 — current_team_member_id() — folder permission lookup

Used by `*_folder_permissions_select`. Tests:

```sql
-- BASELINE: super_admin sees all folder grants
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$SUPER_UUID')::text;
SELECT count(*) FROM public.document_folder_permissions;
SELECT count(*) FROM public.presentation_folder_permissions;

-- BASELINE: regular user sees ONLY grants assigned to their team_member_id
-- (assuming auth_uid maps to team_member.auth_user_id)
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$AUTH_UUID')::text;
SELECT count(*) FROM public.document_folder_permissions;  -- depends on fixtures
```

After REVOKE — repeat, counts must match.

---

## §5 — can_*_folder() — Document & Presentation visibility cascade

Most subtle of the lot. The 4 helpers cascade folder visibility:
- `can_see_*_folder` controls FOLDER row visibility in tree
- `can_access_*_folder` controls FILE row visibility inside folder
- Both use `is_admin()` OR folder.is_public OR explicit permission grant

**Test matrix (4 helpers × 4 personas × 2 ops = 32 cases, but most overlap):**

```sql
-- Setup: identify one public folder, one private folder, one folder with explicit grants
WITH public_doc_folder AS (SELECT id FROM public.document_folders WHERE is_public=true LIMIT 1),
     private_doc_folder AS (SELECT id FROM public.document_folders WHERE is_public=false LIMIT 1),
     granted_doc_folder AS (
       SELECT DISTINCT df.id 
       FROM public.document_folders df 
       JOIN public.document_folder_permissions p ON p.folder_id=df.id 
       LIMIT 1
     )
SELECT 
  (SELECT id FROM public_doc_folder) AS pub,
  (SELECT id FROM private_doc_folder) AS priv,
  (SELECT id FROM granted_doc_folder) AS granted;

-- Per helper × persona, test:
SET LOCAL request.jwt.claims = format('{"sub":"%s","role":"authenticated"}', '$AUTH_UUID')::text;
SELECT 'auth_can_see_public_folder', public.can_see_document_folder('<pub-uuid>');     -- true
SELECT 'auth_can_see_private_folder', public.can_see_document_folder('<priv-uuid>');    -- false
SELECT 'auth_can_see_granted_folder', public.can_see_document_folder('<granted-uuid>'); -- true if $AUTH is grantee, else false
SELECT 'auth_can_access_public_files', count(*) FROM public.document_files WHERE folder_id='<pub-uuid>';
```

Same for `presentation_*` variants.

After REVOKE — repeat, all results must match.

---

## §6 — handle_new_user() — trigger path

This one is different. `handle_new_user()` is fired by an `AFTER INSERT ON auth.users` trigger, NOT called as RPC. Postgres invokes trigger functions via the trigger mechanism (uses the function owner's privileges directly, doesn't check caller's EXECUTE grant).

→ **`handle_new_user()` is safe to REVOKE FROM all roles**, including `authenticated`. Test:

```sql
-- BASELINE: signup creates auth.users row, trigger fires, profiles row created
INSERT INTO auth.users (id, email, email_confirmed_at) 
VALUES (gen_random_uuid(), 'trigger-test@airtuerk.de', now())
RETURNING id;
-- Verify profile auto-created:
SELECT * FROM public.profiles WHERE id=(SELECT id FROM auth.users WHERE email='trigger-test@airtuerk.de');
DELETE FROM auth.users WHERE email='trigger-test@airtuerk.de';
```

After `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;` — repeat the signup. Profile must STILL auto-create.

---

## Apply Migration (after all tests pass)

```sql
-- 20260627110000_revoke_secdef_public_execute.sql
-- D-NNN — Tighten SECURITY DEFINER helper exposure
-- See SECDEF_REVOKE_TEST_PLAN_2026-06-27.md for verification matrix.

-- Helpers used by RLS — keep authenticated, revoke anon + PUBLIC
REVOKE EXECUTE ON FUNCTION public.is_admin()                              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()                        FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid)                  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_team_member_id()                FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_document_folder(uuid)        FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_presentation_folder(uuid)    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_see_document_folder(uuid)           FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_see_presentation_folder(uuid)       FROM anon, PUBLIC;

-- Trigger fn — revoke from EVERYONE (called via trigger mechanism, not RPC)
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM anon, authenticated, PUBLIC;

-- Belt-and-suspenders: confirm authenticated still has EXECUTE on the 8 RLS helpers
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN 
    SELECT unnest(ARRAY[
      'is_admin()','is_super_admin()','get_profile_role(uuid)','current_team_member_id()',
      'can_access_document_folder(uuid)','can_access_presentation_folder(uuid)',
      'can_see_document_folder(uuid)','can_see_presentation_folder(uuid)'
    ]) AS sig
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn.sig);
  END LOOP;
END $$;
```

---

## Post-Apply Verification

```sql
-- 1. Check current grant matrix
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) AS args,
  array_agg(DISTINCT a.privilege_type) FILTER (WHERE a.grantee='anon')         AS anon_grants,
  array_agg(DISTINCT a.privilege_type) FILTER (WHERE a.grantee='authenticated') AS auth_grants,
  array_agg(DISTINCT a.privilege_type) FILTER (WHERE a.grantee='PUBLIC')        AS public_grants
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public'
LEFT JOIN information_schema.routine_privileges a 
  ON a.specific_schema='public' AND a.routine_name=p.proname
WHERE p.proname IN (
  'is_admin','is_super_admin','get_profile_role','current_team_member_id',
  'can_access_document_folder','can_access_presentation_folder',
  'can_see_document_folder','can_see_presentation_folder','handle_new_user'
)
GROUP BY p.proname, p.oid
ORDER BY p.proname;
```

**Expected:**

| proname | anon | authenticated | PUBLIC |
|---|---|---|---|
| is_admin | NULL/empty | {EXECUTE} | NULL/empty |
| is_super_admin | NULL/empty | {EXECUTE} | NULL/empty |
| get_profile_role | NULL/empty | {EXECUTE} | NULL/empty |
| current_team_member_id | NULL/empty | {EXECUTE} | NULL/empty |
| can_access_document_folder | NULL/empty | {EXECUTE} | NULL/empty |
| can_access_presentation_folder | NULL/empty | {EXECUTE} | NULL/empty |
| can_see_document_folder | NULL/empty | {EXECUTE} | NULL/empty |
| can_see_presentation_folder | NULL/empty | {EXECUTE} | NULL/empty |
| handle_new_user | NULL/empty | NULL/empty | NULL/empty |

```sql
-- 2. Live anon negative test (must fail)
SET LOCAL role anon;
SELECT public.is_admin();  
-- Expected: ERROR 42501: permission denied for function is_admin
```

---

## Rollback

```sql
GRANT EXECUTE ON FUNCTION public.is_admin()                              TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin()                        TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid)                  TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_team_member_id()                TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_document_folder(uuid)        TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_presentation_folder(uuid)    TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_see_document_folder(uuid)           TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_see_presentation_folder(uuid)       TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user()                       TO anon, authenticated, PUBLIC;
```

---

## Hard test gate

**DO NOT COMMIT** the REVOKE migration unless ALL of these are TRUE:

- [ ] §1 — every is_admin baseline count matches post-REVOKE count (admin AND non-admin personas)
- [ ] §2 — every is_super_admin baseline count matches post-REVOKE count (super, admin, non-admin)
- [ ] §3 — profile update succeeds for both admin (any) and own-user (self only)
- [ ] §4 — folder_permissions visibility identical pre/post
- [ ] §5 — folder/file visibility identical pre/post for public/private/granted folders
- [ ] §6 — auth.users INSERT still triggers profiles row creation
- [ ] Anon negative test: `SELECT is_admin()` returns 42501
- [ ] Grant matrix verification query returns the expected table

If any check fails: ROLLBACK + investigate. The most likely failure mode is forgetting to keep `authenticated` granted for one of the 8 — fix the GRANT block and re-test.

---

## Related quick-wins (separate migration, not blocked by this)

The Phase-B-Report flagged two adjacent items that share the same risk profile (security defense-in-depth, no demo impact):

1. **Drop `gold_set_answers_insert_public` policy** (1 SQL line)
   ```sql
   DROP POLICY IF EXISTS gold_set_answers_insert_public ON public.gold_set_answers;
   ```
   Quiz UI was removed (per migration `20260626160000_remove_gold_set_quiz_pages`) but the open-INSERT policy lingered. Spam vector, no legitimate caller.

2. **Tighten `rag-knowledge` bucket writes** — replace authenticated-writes with admin-only.

3. **Drop or privatize `documents` bucket** — public=true, 0 objects, legacy.

→ Suggested companion migration: `20260627120000_tighten_storage_and_drop_stale_policies.sql`. Drafted on request.

---

*Generated 2026-06-27 by Hauptchat. Policy→helper-function mapping verified live via Supabase MCP (pg_policies). No writes performed during planning.*

# D-111 — Role-Model Rewrite + Department Admin + AI Admin (Plan of Record)

**Status:** Phase A recon complete + live-DB verified. **Owner-approved 2026-07-01 (§6 resolved).** Ready for Phase B — implementation starts only on explicit green light after this file is reviewed.
**Scope:** Documents Library + AI-Correction workflow. Presentation Hub is **out** (→ D-112, own data model).
**Context:** Grundstruktur, **no real user/production data** in DB yet. Aggressive rewrite OK; reset & re-migrate OK. No prompt-injection hardening required for V1.
**Guardrails:** separate branch; plan review before any write; no force-push, no auto-merge. All SQL in one transactional migration file, registered in `supabase_migrations.schema_migrations` (parity — hash the sorted version set, per CLAUDE.md). DECISIONS.md (+ new D-111 entry) and BUILD_LOG Current State are updated **in the D-111a commit**, not before.

> This document consolidates the implementation brief with **live-DB-verified** facts (project `zkydrymygjrscjbhusxp`). Where the brief and the live DB disagreed, the live DB wins — corrections are marked **⚠ CORRECTED**. Docs are derived; this plan is grounded in `pg_policies` / `pg_proc` / `pg_constraint` and source at `file:line`.

---

## 1. Locked role model

| Role | Users (final) |
|---|---|
| **super_admin (5)** | Buhara Demir, Emirkan Erkara, Ümit Tenekeci, **Ahmet Özbek** (already super — CFO title is a separate `team_members` edit, out of scope), dev@ (preview, load-bearing) |
| **department_admin (6)** | Hakan Sezen, Tim Sahin, Oruc Demir, **Efkan Barin** (was super → demote), Sibel Tobolewski *(invite-first)*, Emre Karakas *(invite-first)* |
| **ai_admin (2)** | Murat Sinim, Selin Köroglu (= "Selin Thoss" geb. Thoß) |
| **user** | Esra Adigüzel (was super → demote) + everyone else |

**ai_admin = FULL rights** (grundstruktur, no injection worries V1): approve + **Edit&Approve** corrections, **direct source entry** (create/edit `company_context`), and full Documents-Library owner rights (create folder, upload/delete own files, grant/revoke on own folders).

**Approach 3 (confirmed):** leave `is_admin()` body untouched (`role IN ('admin','super_admin')`); the data migration empties the `admin` tier so `is_admin()` collapses to super-only across all ~72 legacy policies with zero rewrites and zero over-grant. **Remove `admin` from the CHECK constraints** so it cannot be re-created. New rights are added only via `is_dept_admin()` / `is_ai_admin()` / `is_dept_or_ai_admin()` on a handful of Documents-Library + correction surfaces.

---

## 2. Verified roster (live) — authoritative emails + IDs

⚠ **CORRECTED — the brief's allow-list emails were guesses; 12 of 14 were wrong.** Real pattern = `firstinitial+lastname@airtuerk.de`.

### 2.1 Existing profiles (have auth account) — all 12

| Real email | auth id (`profiles.id`) | Current role | → Target | Note |
|---|---|---|---|---|
| bdemir@airtuerk.de | cc3aaa84-cf93-48d4-8789-67ff4a179e72 | super_admin | super_admin | no change; owns all 8 folders/7 files |
| eerkara@airtuerk.de | 1b300d5f-3446-40f4-a949-dba8bd7f4613 | super_admin | super_admin | no change |
| utenekeci@airtuerk.de | 2e196a70-2607-49d6-837c-cc35294266b3 | super_admin | super_admin | no change |
| aoezbek@airtuerk.de | d0721d37-602e-45fa-9e40-c73890686430 | super_admin | super_admin | **already super — no-op (not a promotion)** |
| dev@airtuerk.de | e6ec8a81-bd6d-442a-9d70-812ef00b9bf6 | super_admin | super_admin | preview acct, no team_member — preserve |
| hakan@airtuerk.de | 6ee93880-95b0-46f2-88fd-e1e2c6d6833c | admin | department_admin | Mgmt / Business Dev |
| tsahin@airtuerk.de | 796f73b3-995d-4860-b1eb-3b19925850be | admin | department_admin | Flugdisposition |
| odemir@airtuerk.de | 67ef810f-fa9c-449c-b112-efc0feb2d46d | admin | department_admin | Mgmt / Project Mgr |
| ebarin@airtuerk.de | 447d581a-5af9-45b3-9191-f881b0316384 | **super_admin** | **department_admin** | IT sysadmin — demotion |
| msinim@airtuerk.de | cea39fea-761c-46a5-bf04-9043892e0d29 | admin | ai_admin | Head of Operations |
| skoeroglu@airtuerk.de | 03b6cac5-c4c5-4515-a34b-c74040fdcb76 | admin | ai_admin | "Selin Thoss" |
| eadiguezel@airtuerk.de | 9d3ee5ff-1b40-4728-baf9-2e68339f06f2 | **super_admin** | **user** | demotion; can be re-promoted for admin-demo testing |

Every existing profile is explicitly assigned → **post-migration: super_admin=5, department_admin=4, ai_admin=2, user=1, admin=0.**

### 2.2 Invite-first (no auth account yet) — seed `user_role_defaults` only

| Real email | team_member id | Dept / Position | Target |
|---|---|---|---|
| stobolewski@airtuerk.de | b1075d47-4abe-46d3-88f9-3cc8aa699c45 | Finance / Debitorenmanagement | department_admin |
| ekarakas@airtuerk.de | 585e8ad0-4bfc-4aca-b313-8595ed483390 | Management / Leitung Vertrieb | department_admin |

After they are invited, `handle_new_user` reads `user_role_defaults` by email → they land as `department_admin` (then dept_admin count = 6).

---

## 3. Verified architecture facts (recon consolidation)

- **`profiles.role` / `user_role_defaults.role`** = `text` + CHECK (`super_admin`,`admin`,`user`) — not enums. Constraint names: `profiles_role_check`, `user_role_defaults_role_check`. `user_role_defaults` PK = `email`.
- **`is_admin()`** = `role IN ('admin','super_admin')`; **`is_super_admin()`** = `role='super_admin'` — both SECDEF STABLE, `search_path=public,pg_temp` ([20260621190523_profile_role_helpers_use_jwt.sql](supabase/migrations/20260621190523_profile_role_helpers_use_jwt.sql)). `is_admin()` gates **~72 live policies** (44 public + 28 storage). Escalation guard `profiles_update_admin` (migration 0032, [20260620020000_profiles_role_escalation_guard.sql](supabase/migrations/20260620020000_profiles_role_escalation_guard.sql)).
- **Documents Library WRITES run service-role, not RLS.** All write actions in [documents-library/actions.ts](src/app/(public)/documents-library/actions.ts) use `createAdminClient()` behind `requireAdmin()`/`requireSuperAdmin()` TS guards; the `is_admin()` *write* policies are a backstop the app bypasses. **READS are the RLS-enforced side** (`document_folders_select` / `document_files_select`). Uploads use **service-role signed URLs** (`createSignedUploadUrl` → client `uploadToSignedUrl`), so **no storage-bucket policy change needed**.
- **`createFolder` sets `created_by = id.userId`** ([actions.ts:112](src/app/(public)/documents-library/actions.ts)) → the owner-branch policy has a populated column to key on. `document_files` has only `uploaded_by` (no `created_by`) → file ownership must derive from `document_folders.created_by`.
- **Grant management** (`getFolderAccess`/`saveFolderAccess`/`revokeFolderAccess`, `setFolderVisibility`, `deleteFolder`) is `requireSuperAdmin()` today; `document_folder_permissions` writes are `is_super_admin()` only. Folder-page UI over-gates writes to `isSuperAdmin` ([folder-page.tsx](src/components/documents/folder-page.tsx)).
- **AI-correction workflow ([src/lib/knowledge/actions.ts](src/lib/knowledge/actions.ts))**: `approveCorrection`/`rejectCorrection` = `requireSuperAdmin()`, run the `ai_corrections` UPDATE on the **RLS client**; RLS `corrections_admin_review` = `(is_admin() OR is_super_admin())`. `createCompanyContextChunk`/`updateCompanyContextChunk` = `requireSuperAdmin()` on RLS client; RLS `company_context_admin_insert/update` = `(is_admin() OR is_super_admin())`. Knowledge queries share `gate()` = `requireSuperAdmin()` + service-role. Page gate [admin/knowledge/page.tsx](src/app/(public)/admin/knowledge/page.tsx) = `isSuperAdmin`.
- **Corpus injection is service-role**: approve → `embed-knowledge` edge fn (`SUPABASE_SERVICE_ROLE_KEY`) → chunks via Voyage `voyage-4-large` → INSERT `confluence_chunks` (`source_type='correction'`) → UPDATE `ai_corrections.applied_to_chunk_id`. **No RLS change needed for the injection.** `confluence_chunks` has no authenticated write policy.
- **Role reaches the app from `profiles` on every request** via `getIdentity()` ([auth.ts](src/lib/auth.ts)), React-cached per request — **not** from the JWT. → role changes take effect on next request; **no re-login/token refresh needed** (run migration when few are active to avoid mid-session "access denied"). `proxy.ts` does not gate auth (CVE-2025-29927); gates live in layouts/pages.
- **CMS-edit-check → no regression.** The 5 current admins have **0** `user_activity_log` rows; `brands/pages/blocks/assets/documents/settings/team_members/team_member_brands` have no editor-tracking columns; `company_context.created_by` all NULL (seeded); `confluence_raw.created_by` is text (Confluence authorship). Removing their `is_admin()` CMS write capability orphans no content.

---

## 4. Migration batch plan (corrected)

One PR, four atomic commits: `role-model+doclib` → `ai-correction` → `audit+notify` → `ui`. All SQL for D-111a/b in **one transactional migration file**.

### D-111a — Role model + Documents Library

**SQL (single transaction), corrected:**

```sql
-- (1) widen both CHECKs temporarily to allow all 5 values during the data move
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','admin','department_admin','ai_admin','user'));
ALTER TABLE public.user_role_defaults DROP CONSTRAINT user_role_defaults_role_check;
ALTER TABLE public.user_role_defaults ADD CONSTRAINT user_role_defaults_role_check
  CHECK (role IN ('super_admin','admin','department_admin','ai_admin','user'));

-- (2) profiles: explicit per-email allow-list — REAL emails (verified). No catch-all.
UPDATE public.profiles SET role='super_admin'
  WHERE email IN ('bdemir@airtuerk.de','eerkara@airtuerk.de','utenekeci@airtuerk.de','aoezbek@airtuerk.de','dev@airtuerk.de');
UPDATE public.profiles SET role='department_admin'
  WHERE email IN ('hakan@airtuerk.de','tsahin@airtuerk.de','odemir@airtuerk.de','ebarin@airtuerk.de');
UPDATE public.profiles SET role='ai_admin'
  WHERE email IN ('msinim@airtuerk.de','skoeroglu@airtuerk.de');
UPDATE public.profiles SET role='user'
  WHERE email IN ('eadiguezel@airtuerk.de');

-- (3) ⚠ CORRECTED: user_role_defaults currently has 5 rows with role='admin'
--     (hakan,msinim,odemir,skoeroglu,tsahin). They MUST be updated, else step (5)
--     (removing 'admin' from the CHECK) fails on those rows.
UPDATE public.user_role_defaults SET role='department_admin'
  WHERE email IN ('hakan@airtuerk.de','tsahin@airtuerk.de','odemir@airtuerk.de');
UPDATE public.user_role_defaults SET role='ai_admin'
  WHERE email IN ('msinim@airtuerk.de','skoeroglu@airtuerk.de');
-- accounts that changed tier / invite-first — seed defaults for re-invite consistency
INSERT INTO public.user_role_defaults (email, role) VALUES
  ('ebarin@airtuerk.de','department_admin'),
  ('stobolewski@airtuerk.de','department_admin'),
  ('ekarakas@airtuerk.de','department_admin')
ON CONFLICT (email) DO UPDATE SET role=EXCLUDED.role;
-- (eadiguezel has no default row → defaults to 'user' on any future re-invite; leave as-is)

-- (4) hard assert: no 'admin' remains anywhere (fail the migration if not zero)
DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role='admin') <> 0
     OR (SELECT count(*) FROM public.user_role_defaults WHERE role='admin') <> 0 THEN
    RAISE EXCEPTION 'D-111a: admin-tier not empty; aborting constraint tightening';
  END IF;
END $$;

-- (5) final CHECKs — remove 'admin' (hardening)
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','department_admin','ai_admin','user'));
ALTER TABLE public.user_role_defaults DROP CONSTRAINT user_role_defaults_role_check;
ALTER TABLE public.user_role_defaults ADD CONSTRAINT user_role_defaults_role_check
  CHECK (role IN ('super_admin','department_admin','ai_admin','user'));

-- (6) new role helpers (SECDEF, pinned search_path — mirror is_super_admin)
CREATE OR REPLACE FUNCTION public.is_dept_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='department_admin'); $$;
CREATE OR REPLACE FUNCTION public.is_ai_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='ai_admin'); $$;
CREATE OR REPLACE FUNCTION public.is_dept_or_ai_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
  SELECT public.is_dept_admin() OR public.is_ai_admin(); $$;
-- GRANT EXECUTE to authenticated (+anon parity with existing helpers) as per repo convention.

-- (7) RLS SELECT owner-branch (READ visibility for owners)
DROP POLICY document_folders_select ON public.document_folders;
CREATE POLICY document_folders_select ON public.document_folders FOR SELECT USING (
  is_public OR public.is_admin() OR public.can_see_document_folder(id)
  OR (public.is_dept_or_ai_admin() AND created_by = (SELECT auth.uid()))
);
DROP POLICY document_files_select ON public.document_files;
CREATE POLICY document_files_select ON public.document_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.document_folders f WHERE f.id = folder_id AND (
    f.is_public OR public.is_admin() OR public.can_access_document_folder(f.id)
    OR (public.is_dept_or_ai_admin() AND f.created_by = (SELECT auth.uid()))
  ))
);

-- (8) grant-management writes: widen to folder owner (super OR dept/ai owner). INSERT/UPDATE/DELETE.
DROP POLICY document_folder_permissions_insert ON public.document_folder_permissions;
CREATE POLICY document_folder_permissions_insert ON public.document_folder_permissions FOR INSERT WITH CHECK (
  public.is_super_admin() OR (public.is_dept_or_ai_admin() AND EXISTS (
    SELECT 1 FROM public.document_folders f WHERE f.id = folder_id AND f.created_by = (SELECT auth.uid())))
);
-- analog for UPDATE (USING+WITH CHECK) and DELETE (USING).
```

Notes: keep `is_admin()`'s body unchanged (it is a super-admin alias post-migration). Adding an RLS **write** owner-branch on `document_folders`/`document_files` is optional defense-in-depth (writes are service-role); recommend deferring to keep the diff tight.

**App layer (parallel):**
1. `src/lib/auth.ts` — extend `Identity` with `isDeptAdmin`, `isAiAdmin`; add `requireLibraryWriter(folderId?)` (super passes; dept/ai must pass an ownership check on `folderId`) and `requireAiAdminOrSuper()`. Add a `checkFolderOwnership(folderId, userId)` reading `document_folders.created_by`.
2. `Role` union → `'super_admin' | 'department_admin' | 'ai_admin' | 'user'` (drop `'admin'`); recompute `isAdmin` (stays super-only naturally) + new booleans in `getIdentity()`.
3. [documents-library/actions.ts](src/app/(public)/documents-library/actions.ts): `createFolder` → `requireLibraryWriter()` (no id = top-level create); `renameFolder`/`moveFolder`/`setFolderColor`/upload ticket+finalize/`editFile`/`moveFile`/`replaceFile`/`deleteFile` → `requireLibraryWriter(folderId)`; `setFolderVisibility`/`deleteFolder`/`saveFolderAccess`/`revokeFolderAccess` → `requireLibraryWriter(folderId)` (super OR owner).
4. UI: [folder-page.tsx](src/components/documents/folder-page.tsx) gate `isSuperAdmin` → `isSuperAdmin || (isDeptOrAiAdmin && ownsFolder)`; [sidebar.tsx](src/components/shell/sidebar.tsx) "New Folder" visibility; role `<select>` in [create-person-modal.tsx](src/components/admin/create-person-modal.tsx) + [user-detail-modal.tsx](src/components/admin/user-detail-modal.tsx) (super-only). **Shared components** [src/components/permissions/*](src/components/permissions) are used by Presentation Hub too — thread role logic without changing Hub behavior (Hub stays super-only until D-112).

### D-111b — AI-Correction workflow for ai_admin

**SQL — ⚠ CORRECTED: three policies, not one** (all run on the RLS client):

```sql
DROP POLICY corrections_admin_review ON public.ai_corrections;
CREATE POLICY corrections_admin_review ON public.ai_corrections FOR UPDATE
  USING (public.is_admin() OR public.is_super_admin() OR public.is_ai_admin())
  WITH CHECK (public.is_admin() OR public.is_super_admin() OR public.is_ai_admin());

-- ai_admin "direct source entry" — company_context writes must admit ai_admin
DROP POLICY company_context_admin_insert ON public.company_context;
CREATE POLICY company_context_admin_insert ON public.company_context FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_super_admin() OR public.is_ai_admin());
DROP POLICY company_context_admin_update ON public.company_context;
CREATE POLICY company_context_admin_update ON public.company_context FOR UPDATE
  USING (public.is_admin() OR public.is_super_admin() OR public.is_ai_admin())
  WITH CHECK (public.is_admin() OR public.is_super_admin() OR public.is_ai_admin());
-- company_context_admin_delete stays is_super_admin() (ai_admin scope = create/edit, not delete)
```

**Server actions** [src/lib/knowledge/actions.ts](src/lib/knowledge/actions.ts): `approveCorrection`, `rejectCorrection`, `createCompanyContextChunk`, `updateCompanyContextChunk` → `requireSuperAdmin()` → `requireAiAdminOrSuper()`. Knowledge `gate()` → widen to `requireAiAdminOrSuper()`. **Decided (§6.1):** ai_admin gets the **whole `/admin/knowledge` surface** (sources + reviews + quality + taxonomy) via the shared `gate()` — reviews-only would be inconsistent with the direct-source-entry rights. No `gateCorrectionReview()` split.
**UI:** [admin/knowledge/page.tsx](src/app/(public)/admin/knowledge/page.tsx) gate → `if (!identity?.isSuperAdmin && !identity?.isAiAdmin) notFound()`; Reviews-tab buttons already server-guarded. Edit&Approve + direct-source-entry are enabled (no "as-is" limit).

### D-111c — Audit + Notification (no migration)

Add `logActivity()` (existing helper, [src/lib/users.ts](src/lib/users.ts); `metadata jsonb` already exists) at: `createFolder` (`folder_created`), `deleteFolder` (`folder_deleted`), upload finalize (`file_uploaded`), `deleteFile` (`file_deleted`), `approveCorrection`/`rejectCorrection`, `createCompanyContextChunk` (`source_created`) — each with `metadata.actor_role`.
New edge fn `notify-dept-admin-activity` mirroring `notify-folder-access`: `RESEND_API_KEY`, `from: terminal@airtuerk.ai`, invoked from the server actions via `admin.functions.invoke()`. Recipients = `SELECT email FROM profiles WHERE role='super_admin'` **excluding `dev@airtuerk.de`** (test account, not a monitored inbox).

### D-111d — UI polish

Role selector options (super-only), Documents-Library create/upload/manage affordances for dept/ai owners, folder ⋮ conditional visibility, Knowledge Reviews tab enabled for ai_admin.

---

## 5. Verification plan

**Pre-migration snapshot:** capture `SELECT id,email,role FROM profiles` into the migration/PR description (prefer git over a permanent `_d111_role_snapshot` public table — avoids ledger drift).

**Post-migration asserts:**
```sql
SELECT role, COUNT(*) FROM profiles GROUP BY role;
-- expect: super_admin=5, department_admin=4, ai_admin=2, user=1, admin=0
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='profiles_role_check';
-- expect: 'admin' absent
SELECT role, COUNT(*) FROM user_role_defaults GROUP BY role;  -- no 'admin'
```

**RLS matrix (5 roles + anon)** per surface: super (all), department_admin (own-folder create/upload/grant ✓, other-folder edit → 403), ai_admin (dept rights + corrections approve/edit&approve + company_context create/edit ✓), user (read public/granted, edit → 403), anon (read public only; `current_team_member_id()` → NULL — the D-080 near-miss).

**Live preview (per role, before merge):** Buhara sees all + admin panel; Hakan (dept) starts empty → creates folder (only he sees) → flips public (all see) → grants a user (that user sees) → edit Buhara's folder → 403; Murat (ai) sees Reviews → approve lands chunk in `confluence_chunks` → edit&approve lands `final_content` → create `company_context` chunk shows in Sources; Esra (user) sees only public, no admin panel; super_admins (minus dev@) get the notification email on Hakan's folder-create. Note Buhara's existing 8 folders/7 files remain owned by him (super) → untouched.

---

## 6. Resolved decisions (owner sign-off 2026-07-01)

1. **`gate()` widening → whole surface.** ai_admin gets all of `/admin/knowledge` (sources + reviews + quality + taxonomy). Reviews-only would be inconsistent with direct-source-entry rights. No split gate. *(baked into D-111b)*
2. **Notification recipients → exclude `dev@` explicitly.** Recipient query = `SELECT email FROM profiles WHERE role='super_admin' AND email <> 'dev@airtuerk.de'`. The preview/test account gets no notifications. *(baked into D-111c)*
3. **Ahmet "CFO" title → OUT OF SCOPE for D-111.** `team_members.position` stays `"Kaufmännischer Leiter"`; his role move is a no-op (already super_admin). A title change, if wanted, is a separate task — not a role-migration concern.
4. **Efkan super→department_admin → confirmed OK.** He uses no CMS (0 activity-log rows); Doc-Library writes stay service-role, storage via signed URLs. Fallback if a post-migration pain-point appears: Buhara issues a per-folder D-080 grant. No super-only capability retained.
5. **`eadiguezel` → direct `UPDATE profiles.role='user'` in D-111a** (no `user_role_defaults` row needed — absent row defaults to `user`). For later admin-demo testing, a super_admin promotes her temporarily via `updateUserRole()`, tests, then demotes again.

---

## 7. Reversibility & ledger

- D-111a: transactional migration; revert = restore prior constraints + role UPDATEs from the snapshot in the PR. D-111b: policy source saved in the same migration. D-111c: additive `logActivity()` + one edge fn — trivial revert. D-111d: UI-only.
- On implementation: register the migration in `schema_migrations` (verify parity by hashing the sorted version set), add the **D-111** entry to [spec/DECISIONS.md](spec/DECISIONS.md), and update the BUILD_LOG Current State + README migration table / ARCHITECTURE counts in the same commit (CLAUDE.md: keep derived docs honest in the same change).

---

*Recon method: live DB (`pg_policies`/`pg_proc`/`pg_constraint`, project `zkydrymygjrscjbhusxp`) + migrations + source, D-110 pattern (multi-agent code recon + 3-lens adversarial pass). Nothing written or deployed for this plan.*

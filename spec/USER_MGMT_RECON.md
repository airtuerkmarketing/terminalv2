# User-Management — Read-Only Recon (Ist-Zustand)

**Date:** 2026-06-24
**Scope:** Verified ground truth of the user-management & auth stack — live DB
(`zkydrymygjrscjbhusxp`) + repo source. **Read-only**: no migrations, no DB writes, no code
changes other than this file. Every fact is tagged with its source (SQL query / file path).
"OFFEN" marks anything not directly verifiable here.

> **TL;DR for the implementation session:** The team directory (63), the 3-tier role model, the
> admin panel, `inviteUser`, `profiles_v`, and the force-password gate **already exist and are
> live**. The real gaps are: `last_invited_at` column, DoB/phone backfill (0/63 today), invite/
> bulk-invite **UI**, self-service `/account/profile`, and AI identity injection. The original
> plan's premises (re-seed ~54 people, add `team_member_id` FK, create an identity view, rewrite
> `handle_new_user` to read metadata) are largely already done or would regress working code.

---

## 1. Schema-Inventar (live DB)

Source: Supabase MCP `list_tables verbose:true` + `execute_sql` over `information_schema` /
`pg_indexes` / `pg_policies` / `pg_class`.

### `team_members` — RLS enabled, **63 rows**

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| first_name | text | NO | — |
| last_name | text | NO | — |
| position | text | YES | — |
| department | text | YES | — |
| initials | text | NO | — |
| avatar_asset_id | uuid | YES | — |
| email | text | YES | — |
| sort_order | integer | NO | `0` |
| created_at | timestamptz | NO | `now()` |
| updated_at | timestamptz | NO | `now()` |
| is_lead | boolean | NO | `false` |
| joined_year | integer | YES | — |
| tools | text[] | NO | `'{}'` |
| tasks | text | YES | — |
| auth_user_id | uuid | YES | — |
| date_of_birth | date | YES | — |
| show_birthday | boolean | NO | `false` |
| phone | text | YES | — |

- **PK:** `team_members_pkey (id)`
- **FKs:** `avatar_asset_id → assets(id)`; `auth_user_id → auth.users(id)` (ON DELETE SET NULL)
- **UNIQUE:** `team_members_email_key (email)`; `idx_team_members_auth_user_id_unique (auth_user_id) WHERE NOT NULL`
- **Indexes:** `idx_team_members_email_lower (lower(email))`, `team_members_department_idx`, `team_members_sort_order_idx`, `idx_team_members_auth_user_id`
- **No UNIQUE on (first_name,last_name)** — name-based upsert is unsafe (two "Selin"s exist).
- **RLS:** `team_select_public` (SELECT, role `public`, `USING true`); `team_modify_admin` (ALL, `authenticated`, `is_admin()`).

### `profiles` — RLS enabled, **3 rows**

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | — (PK, FK → auth.users) |
| email | text | NO | — |
| full_name | text | YES | — |
| role | text | NO | `'user'` (CHECK in `super_admin|admin|user`) |
| created_at | timestamptz | NO | `now()` |
| team_member_id | uuid | YES | — (FK → team_members.id, ON DELETE SET NULL) |
| updated_at | timestamptz | NO | `now()` |

- **PK:** `profiles_pkey (id)`; **FKs:** `profiles_id_fkey (id→auth.users)`, `profiles_team_member_id_fkey (team_member_id→team_members.id)`
- **UNIQUE:** `idx_profiles_team_member_id_unique (team_member_id) WHERE NOT NULL`; **Indexes:** `idx_profiles_team_member_id`, `profiles_role_idx`
- **CHECK:** `profiles_role_check (role IN ('super_admin','admin','user'))`
- **RLS:** `profiles_select_own` (`id = auth.uid()`), `profiles_select_admin` (`is_admin()`),
  `profiles_update_own` (USING `id=auth.uid()`, WITH CHECK `id=auth.uid() AND role=get_profile_role(id)` → **users can't change own role**),
  `profiles_update_admin` (USING `is_admin()`, WITH CHECK `is_admin() AND (is_super_admin() OR role=get_profile_role(id))` → **the D-055/0032 escalation guard**).

### `user_role_defaults` — RLS enabled, **10 rows** (PK = `email`)

Columns: `email` (PK), `role` (CHECK), `created_at`. RLS: `user_role_defaults_super_admin` (ALL, `is_super_admin()`).
Contents (live):

| role | emails |
|---|---|
| super_admin | aoezbek@, bdemir@, dev@, eerkara@, utenekeci@ (all @airtuerk.de) |
| admin | hakan@, msinim@, odemir@, skoeroglu@, tsahin@ (all @airtuerk.de) |

> Note: `hakan@airtuerk.de` breaks the `<initial><lastname>@` pattern of the others (matches the
> `team_members` row for Hakan Sezen). OFFEN: intended, or should it be `hsezen@`?

### `auth.users` — schema only (no data dumped)

Standard GoTrue table. Live counts: **3 users, all email-confirmed, all have signed in.** The
force-password flag lives in `raw_app_meta_data.force_password_change` (read by `getIdentity`,
[src/lib/auth.ts:93](../src/lib/auth.ts)). Authenticated/RLS client **cannot** SELECT this table (see §2).

### `user_activity_log` — RLS enabled, **2 rows** (related, for completeness)

Cols: `id` bigint PK, `user_id` uuid (= ACTOR), `action` text, `resource_type`, `resource_id` uuid,
`metadata` jsonb, `created_at`. RLS: `activity_self_read`, `activity_admin_read_department`,
`activity_super_admin_read_all`. **No INSERT policy → writes are service-role only (unforgeable).**

---

## 2. View `profiles_v`

Source: `pg_get_viewdef`, `pg_class.reloptions`, `role_table_grants`, live `SET ROLE` probe.

- **Definition:** `SELECT p.id, email, full_name, role, team_member_id, created_at, updated_at,
  u.last_sign_in_at, u.email_confirmed_at, tm.first_name, last_name, position, department,
  initials, avatar_asset_id, joined_year, is_lead, tools, date_of_birth, show_birthday, phone
  FROM profiles p LEFT JOIN auth.users u ON u.id=p.id LEFT JOIN team_members tm ON tm.id=p.team_member_id`
- **`reloptions = {security_invoker=true}`** (confirmed). RLS not applicable to the view itself (`relrowsecurity=false`); source-table RLS applies under invoker.
- **Grants:** SELECT is granted to `authenticated`, `anon`, `service_role`, `postgres`. So the
  grant is **not** the blocker.
- **Live probe** (`SET ROLE authenticated; SELECT 1 FROM profiles_v LIMIT 1`):
  → **`FAILED -> permission denied for table users (42501)`**.
- **Why:** `security_invoker` runs the `auth.users` JOIN as the *invoking* `authenticated` role,
  which has no SELECT on `auth.users`. So `profiles_v` is usable **only by the service role**.

---

## 3. Trigger `handle_new_user`

Source: `pg_get_functiondef` + `information_schema.triggers`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE assigned_role text;
BEGIN
  SELECT role INTO assigned_role FROM public.user_role_defaults WHERE email = NEW.email;
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', COALESCE(assigned_role,'user'));
  RETURN NEW;
END; $function$
```

- **Binding:** trigger `on_auth_user_created` — **AFTER INSERT on `auth.users`**, FOR EACH ROW.
- **Reads:** `user_role_defaults` (by email) + `auth.users.email` + `raw_user_meta_data->>'full_name'`.
  Does **NOT** read `user_metadata` for the role.
- **Writes `profiles`:** `id, email, full_name, role`. Does **not** set `team_member_id` (linked
  separately — by `inviteUser`/seed script).
- **Email not in `user_role_defaults`:** `COALESCE(..., 'user')` → defaults to `'user'`, never NULL,
  never errors. This **structurally prevents super_admin auto-grant** (data-driven, D-048).

---

## 4. `src/lib/users.ts` (Stage-6 server layer)

Source: full read of [src/lib/users.ts](../src/lib/users.ts). 11 exported functions:

| Function | Signature | Notes |
|---|---|---|
| `getAllUsers` | `(filters?, pagination?) → UserListPage` | RLS read of `profiles` + embedded team_member; `last_sign_in_at` enriched via **service-role** `auth.admin.listUsers` (admins only); `q`/`hasLogin` filtered in memory; paginated in memory (cap `MAX_USER_FETCH=1000`). |
| `getUserById` | `cache((userId) → UserDetail|null)` | RLS read + brands via `team_member_brands`; sign-in via `auth.admin.getUserById`. |
| `getUserActivityLog` | `(userId, pagination?) → ActivityLogPage` | RLS-scoped; no explicit role check. |
| `getUserStats` | `(userId) → UserStats` | upload count / 30-day / last activity, RLS-scoped. |
| `updateUserProfile` | `(userId, patch) → void` | **requireAdmin**; writes **team_members** (service-role); throws `NO_TEAM_MEMBER`/`INVALID_NAME`. Fields: first/last name, department, phone, dateOfBirth, showBirthday. |
| `updateUserRole` | `(userId, newRole) → void` | **requireAdmin** + `SELF_LOCK`; writes via **RLS client** so the 0032 guard is the real gate (plain admin → `NOT_AUTHORIZED`). |
| `inviteUser` | `(InviteUserInput) → {userId}` | **requireAdmin** + tier guard (admin/super_admin role needs super_admin actor). See below. |
| `uploadUserAvatar` | `(userId, file) → {assetId,url}` | requireAdmin; validates png/jpeg/webp ≤2MB; writes `avatars` bucket + `assets` + `team_members.avatar_asset_id`. |
| `deactivateUser` | `(userId) → void` | **requireSuperAdmin** + `SELF_LOCK`; bans auth account ~100y. |
| `logActivity` | `(LogActivityInput) → void` | service-role insert; never throws. |
| `getAllTeamMembers` | `(filters?) → {teamMembers, totalCount}` | the 63-row directory (base = `team_members`, LEFT JOIN profile for role + avatar); derives `loginStatus` active/invited/not_invited. |

**`inviteUser` detail** ([users.ts:604](../src/lib/users.ts)):
- Auth API: **`admin.auth.admin.inviteUserByEmail(email)`** — **no `user_metadata` passed**, **no `redirectTo`**.
- After invite: UPDATE the new profile's `role` (+ optional `team_member_id`), and set
  `team_members.auth_user_id` (bidirectional link). Logs `invite_user`.
- **No rate-limit.** **`last_invited_at` is never set** (column doesn't exist — see §9). **No `bulkInvite`.** **No `createTeamMember`.**

`getIdentity`/`requireAdmin`/`requireSuperAdmin` live in [src/lib/auth.ts](../src/lib/auth.ts);
`getIdentity` reads `profiles` + embedded `team_members` (NOT `profiles_v`, by design — see §7).

---

## 5. UI `/admin/users`

Source: [src/app/(public)/admin/users/page.tsx](<../src/app/(public)/admin/users/page.tsx>), `actions.ts`, and `src/components/admin/`.

- Route is in the **`(public)` group** (renders inside the glass shell). Gate: `getIdentity()` →
  **`notFound()` unless `isSuperAdmin`** (404, doesn't reveal route).
- Data source: **`getAllTeamMembers()`** (the 63-row directory) + `getDepartments()`. **Not** `profiles_v`, **not** `getAllUsers`.
- Renders `<UserAdminPanel>` ([src/components/admin/user-admin-panel.tsx](../src/components/admin/user-admin-panel.tsx)) with rows `user-row.tsx`.
- Actions present today (`actions.ts`): `loadUserActivity` (lazy activity log), `updateUserRoleAction` (role change → German error mapping).
- **Available in UI:** listing, filter (department/role/status), search, click-row → read-only detail modal, **role change** (7C-light).
- **NOT in UI:** invite / resend / bulk-invite / create-new-person / CSV export. **No component calls `inviteUser`** (grep: the only `inviteUser` references are its own definition + the docstring in `users.ts`). `inviteUser` is server-ready but **unwired**.

---

## 6. Auth flow for invited users

Source: Glob `src/app/**/{login,auth,account}/**` + [src/app/(public)/layout.tsx](<../src/app/(public)/layout.tsx>).

- **`/auth/welcome`** — does **not** exist. **`/auth/set-password`** — does **not** exist. There is **no `/auth/*` and no `/account/*`** route group.
- All auth UI lives under **`/login`**: `page.tsx`, `login-form.tsx`, `forgot-password/page.tsx`,
  `update-password/page.tsx` + `update-password-form.tsx` + `update-password/actions.ts`, `actions.ts`, `layout.tsx`.
- **Force-password-change gate:** [src/app/(public)/layout.tsx:163-165](<../src/app/(public)/layout.tsx>) —
  `if (identity.forcePasswordChange) redirect("/login/update-password?type=force")`. (Anonymous → `/login` at line 156-158.)
- **Trigger mechanism:** `getIdentity().forcePasswordChange` = `auth.users.raw_app_meta_data.force_password_change === true`
  ([auth.ts:93](../src/lib/auth.ts)), seeded by migration `seed_force_password_change_flag` (see §11). `/login*` sits outside the `(public)` group, so no redirect loop.
- An invited user clicking the magic link lands via the Supabase callback; there is **no custom
  welcome/onboarding landing or self-service profile page** today.

---

## 7. AI chat identity injection (Ist)

Source: [supabase/functions/rag-query/index.ts](../supabase/functions/rag-query/index.ts), [src/lib/rag/client.ts](../src/lib/rag/client.ts).

- The frontend (`ragQueryStream`) sends **only** `{question, session_id, conversation_history}` +
  `Authorization: Bearer <access_token>`. No user fields in the body ([client.ts:69-75](../src/lib/rag/client.ts)).
- The edge function calls `supabaseUser.auth.getUser()` ([index.ts:92](../supabase/functions/rag-query/index.ts)) but uses `user.id` **only** to set
  `ai_chat_sessions.user_id` ([index.ts:118](../supabase/functions/rag-query/index.ts)). It is **not** put into the prompt.
- **`buildSystemPrompt(chunks)`** ([index.ts:277](../supabase/functions/rag-query/index.ts)) takes only retrieved RAG chunks. ⚠️ The
  "identity" terminology in this file (`RESERVED_IDENTITY_SLOTS`, `rerankWithIdentity`,
  `IDENTITY_CATEGORIES = ['mission','brand_voice']`) refers to **persona/brand-voice RAG chunks**,
  **NOT** the logged-in user. There is **no** name/position/department/role of the current user in
  the system prompt.
- **`profiles_v` is NOT used** in the prompt path (nor anywhere in `src/` — only referenced in
  doc-comments explaining why `getIdentity` avoids it). So §2's failure does not currently break
  anything; it just means any future identity injection must use the **`profiles` + embed** path
  (like `getIdentity`) or a **service-role** read of `profiles_v` — never the RLS client on `profiles_v`.

---

## 8. Personal-email employees (Ist-Zustand)

Source: `SELECT … FROM team_members WHERE email !~ '@airtuerk(holidays)?\.de$'` (8 rows).

| Name | Email | Department | Position |
|---|---|---|---|
| Nargiza Ak | nargizadzhelilova@gmail.com | Verwaltung | Service-/Reinigungskraft |
| Yigit Aktas | digitaktas@gmail.com | Service | Service Agent |
| Shaima Bouzo | sbouzo93@hotmail.de | Service | Service Agent |
| Eyüp Buldan | eyupbuldan@gmail.com | Flugdisposition | Service Agent |
| Tugba Burnali | tugbaburnali@gmail.com | Service | Service Agent |
| Ozge Caglar | ozge.caglar@hotmail.com | Vertrieb | Sales Representative |
| Yasin Furkan Cingi | yasin.cingi@outlook.de | Service | Service Agent |
| Aise Molla Isa | aysem.isa@outlook.de | Service | Service Agent |

**Decision (FINAL — Variante A):** Privat-Email-Personen bleiben in `team_members`. Im Admin-Panel
ist der Invite-Button für diese Personen disabled, mit einer Pill **„Privat-Email — Invitation
gesperrt"**. Sobald Ahmet eine corp `@airtuerk.de`-Adresse für die Person bereitstellt, wird
`team_members.email` aktualisiert und der Invite-Button automatisch aktiviert.

---

## 9. DoB / Phone backfill gap

Source: `execute_sql` count.

- Columns **exist**: `team_members.date_of_birth` (date), `team_members.phone` (text). Added by migration `team_members_user_panel_fields` (§11).
- **Populated: `date_of_birth` = 0 / 63, `phone` = 0 / 63.** Both entirely empty.
- → No migration needed for the columns; a **data backfill** is needed (UPSERT **by email**, the
  unique key — never by name). Prereq for the V1.1 birthday feature.
- OFFEN: the source JSON for DoB/phone (the "103 entries") is not in the repo — provide its path for the backfill step.

---

## 10. DECISIONS.md / BUILD_LOG.md — relevant entries

Source: grep over [spec/DECISIONS.md](DECISIONS.md), [spec/BUILD_LOG.md](BUILD_LOG.md).

- **D-033** — Auth-gating in Server Component layouts (not proxy), per CVE-2025-29927; layout calls `redirect()`.
- **D-047** — Three-tier role model `super_admin|admin|user`; `is_admin()` kept, `is_super_admin()` added. Migration `0030`.
- **D-048** — Data-driven role assignment: `user_role_defaults(email→role)` + `handle_new_user` applies, default `user`. Seeded super-admins incl. `dev@`. Migration `0030` (+ dev@ in `0031`). **← directly contradicts the original plan's "rewrite trigger to read user_metadata".**
- **D-055** — Profiles role-escalation guard: admins can't change `role` unless super_admin. Migration `0032`. (= the `profiles_update_admin` WITH CHECK in §1.)
- **BUILD_LOG** — "Shipped … User Panel (admin/users list + detail, role picker, seeded key users)"; "File System v2 — roles + folder Document Library (2026-06-20)"; first admin user created via Studio.
- OFFEN: no DECISIONS entry yet for *invite UX*, *onboarding flow*, or *AI identity injection* — these are unspecified/unbuilt.

---

## 11. Migrations-Stand + Ledger-Drift (quantified)

Source: Glob `supabase/migrations/*.sql` (**53 local files**) vs `supabase_migrations.schema_migrations` (**52 DB entries**).

- **Highest local file:** `20260623115541_persona_v2_context_entries.sql`.
- **Highest DB entry:** `20260623115541` (`persona_v2_context_entries`). Tops match.
- Local files are **mixed-scheme**: 33 numbered `0001`–`0033` + 20 timestamped. The DB ledger is
  **all-timestamped**; the early 33 numbered files were recorded under timestamps with the
  prefix-stripped name (e.g. `0001…` → `20260615153912 initial_schema`), so they match **by name**, not by version id.
- **Last migrations touching the user/team tables:** `team_members_user_panel_fields`
  (`20260621111732`, added auth_user_id/date_of_birth/show_birthday/phone), `profiles_team_member_link`
  (`20260621111114`, added team_member_id FK + updated_at), `profiles_v_view` (`20260621123833`),
  the RLS fixes (`20260621190428/190523/190548`), and `seed_force_password_change_flag` (DB `20260622105118`).

### Drift (matches the known 0014–0016 gap + others)

**A. Local files with NO matching DB ledger entry (4):**
- `0014_apix_network_hardcoded.sql`
- `0015_apix_presentation_hardcoded.sql`
- `0016_apix_group_structure_page.sql`
- `20260622120000_remove_internal_branding_configurator.sql`

**B. DB ledger entries with NO matching local file (3):**
- `20260617220906 seed_internal_branding_applied_fix_iphone_path`
- `20260618143011 create_rag_knowledge_bucket`
- `20260618143026 rag_knowledge_bucket_policies`

**C. Version-id mismatch (same migration, 1):**
- `seed_force_password_change_flag` — local file `20260622150000_*` vs DB version `20260622105118`.

**Net:** the user/team/profiles schema itself is consistent DB⇄source; the drift is concentrated in
APIX-page seeds (local-only, applied via direct data ops historically) and storage-bucket/branding
migrations (DB-only / version-skewed). Any new migration should be **timestamped**, and the drift
above should be reconciled in a dedicated session **before** relying on `supabase db push`/`diff`.
OFFEN: whether `20260622120000_remove_internal_branding_configurator` was applied to prod under a
different version or not at all (its feature removal appears effective, but no ledger row confirms it).

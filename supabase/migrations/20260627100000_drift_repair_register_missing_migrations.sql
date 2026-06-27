-- ============================================================================
-- 20260627100000_drift_repair_register_missing_migrations.sql
-- ============================================================================
--
-- D-081 (see DECISIONS.md) — Drift Repair: register 5 schema changes
-- that were applied via execute_sql to live but never recorded in
-- supabase_migrations.schema_migrations. See HEALTH_CHECK_2026-06-27.md and
-- LEDGER_RECONCILE_PLAN_2026-06-27.md.
--
-- Context (verified 2026-06-27 via Supabase MCP, Phase A pre-verify):
--   ✅ all 5 columns/indexes/policies/cron jobs already exist on prod
--   ✅ live schema matches what these migration files specify
--   ❌ schema_migrations is missing 5 rows → reproducibility broken
--      (supabase db reset on a clean DB diverges from current prod)
--
-- This migration is NoOp on the actual schema. It only seeds the registry
-- so `supabase migration list --linked` shows clean parity, and so a fresh
-- env build replays the canonical migrations from disk in the right order.
--
-- The 5 original migration files in supabase/migrations/ remain authoritative
-- and idempotent. This file references them but does not re-execute them.
--
-- Idempotency: ON CONFLICT (version) DO NOTHING. Re-apply safe.
--
-- NOTE on apply method: on prod this was applied via execute_sql together with
-- an explicit registry row for THIS migration's own version (20260627100000),
-- because the MCP apply_migration helper would auto-assign a now-timestamp
-- version and re-introduce a 1-file drift. The file body below stays at the
-- 5 backfill rows only, so the CLI migration runner records 20260627100000
-- itself on a fresh `db reset` without a duplicate-key conflict.
--
-- ============================================================================
-- Pre-verify (run before this migration; expect 0 rows of the 5 listed)
-- ============================================================================
--
-- SELECT version, name FROM supabase_migrations.schema_migrations
-- WHERE version IN (
--   '20260626170000','20260626180000','20260626190000',
--   '20260626200000','20260626210000'
-- ) ORDER BY version;
--
-- Also confirm schema is already in place (expect all 6 = true):
--
-- SELECT
--   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='document_folders' AND column_name='color') AS df_color,
--   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='document_files'   AND column_name='deleted_at') AS df_del,
--   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='presentation_folders' AND column_name='color') AS pf_color,
--   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='presentation_files'   AND column_name='deleted_at') AS pf_del,
--   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='presentation_folders' AND column_name='is_public') AS pf_vis,
--   EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='presentation_folders' AND policyname='presentation_folders_select') AS pf_pol;
--
-- ============================================================================

insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
values
  (
    '20260626170000',
    'document_folders_color',
    array[
      '-- D-074 — see supabase/migrations/20260626170000_document_folders_color.sql',
      '-- Applied via execute_sql on 2026-06-26; registered post-hoc on 2026-06-27.',
      '-- Schema: document_folders.color text NULL CHECK (color IS NULL OR color IN (''grey'',''blue'',''green'',''yellow''))'
    ],
    'drift-repair-2026-06-27'
  ),
  (
    '20260626180000',
    'document_files_trash',
    array[
      '-- D-076 — see supabase/migrations/20260626180000_document_files_trash.sql',
      '-- Applied via execute_sql on 2026-06-26; registered post-hoc on 2026-06-27.',
      '-- Schema: document_files.deleted_at timestamptz, document_files.deleted_by uuid FK auth.users',
      '-- Indexes: document_files_deleted_at_idx, document_files_folder_live_idx',
      '-- Function: public.purge_expired_trashed_documents() SECURITY DEFINER',
      '-- Cron: purge-expired-trashed-documents @ 30 3 * * *'
    ],
    'drift-repair-2026-06-27'
  ),
  (
    '20260626190000',
    'presentation_folders_color',
    array[
      '-- D-077 — see supabase/migrations/20260626190000_presentation_folders_color.sql',
      '-- Applied via execute_sql on 2026-06-26; registered post-hoc on 2026-06-27.',
      '-- Schema: presentation_folders.color text NULL CHECK (color IS NULL OR color IN (''grey'',''blue'',''green'',''yellow''))'
    ],
    'drift-repair-2026-06-27'
  ),
  (
    '20260626200000',
    'presentation_files_trash',
    array[
      '-- D-078 — see supabase/migrations/20260626200000_presentation_files_trash.sql',
      '-- Applied via execute_sql on 2026-06-26; registered post-hoc on 2026-06-27.',
      '-- Schema: presentation_files.deleted_at timestamptz, presentation_files.deleted_by uuid FK auth.users',
      '-- Indexes: presentation_files_deleted_at_idx, presentation_files_folder_live_idx',
      '-- Function: public.purge_expired_trashed_presentations() SECURITY DEFINER',
      '-- Cron: purge-expired-trashed-presentations @ 45 3 * * *'
    ],
    'drift-repair-2026-06-27'
  ),
  (
    '20260626210000',
    'presentation_folder_visibility',
    array[
      '-- D-079 — see supabase/migrations/20260626210000_presentation_folder_visibility.sql',
      '-- Applied via execute_sql on 2026-06-26; registered post-hoc on 2026-06-27.',
      '-- Schema: presentation_folders.is_public boolean NOT NULL DEFAULT true',
      '-- RLS: presentation_folders_select (visible if is_public OR is_admin())',
      '-- RLS: presentation_files_select (visible if folder.is_public OR is_admin())'
    ],
    'drift-repair-2026-06-27'
  )
on conflict (version) do nothing;

-- ============================================================================
-- Post-verify (run after; expect 5 rows, all matching above versions)
-- ============================================================================
--
-- SELECT version, name, created_by FROM supabase_migrations.schema_migrations
-- WHERE version IN (
--   '20260626170000','20260626180000','20260626190000',
--   '20260626200000','20260626210000'
-- ) ORDER BY version;
--
-- Expected output (5 rows):
--   20260626170000 | document_folders_color         | drift-repair-2026-06-27
--   20260626180000 | document_files_trash           | drift-repair-2026-06-27
--   20260626190000 | presentation_folders_color     | drift-repair-2026-06-27
--   20260626200000 | presentation_files_trash       | drift-repair-2026-06-27
--   20260626210000 | presentation_folder_visibility | drift-repair-2026-06-27
--
-- Then verify `supabase migration list --linked` shows zero pending,
-- and total registered = 75.
--
-- ============================================================================

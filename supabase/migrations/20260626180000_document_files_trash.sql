-- D-076 — Trash (soft-delete) for Document Library files, 30-day retention.
--
-- Deleting a file now sets deleted_at instead of removing the row + blob. Every
-- normal file list/count filters `deleted_at IS NULL`, so trashed files vanish
-- from the library but survive ≥30 days in a Trash view (restore / delete
-- forever). A daily pg_cron job purges anything trashed > 30 days ago.
--
-- Additive + nullable → no-op for existing rows. The app layer probes for these
-- columns (rollout guard) so it works before this migration is applied too.

alter table public.document_files
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- Trash listing: trashed rows, newest first.
create index if not exists document_files_deleted_at_idx
  on public.document_files (deleted_at desc) where deleted_at is not null;
-- Live in-folder listing fast path (mirrors document_files_folder_sort_idx but
-- only over non-trashed rows, which is what every normal read filters to).
create index if not exists document_files_folder_live_idx
  on public.document_files (folder_id, sort_order, created_at, id) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- 30-day auto-purge. SECURITY DEFINER so the cron/service role can delete the
-- storage.objects rows (library bucket) alongside the file rows. EXECUTE revoked
-- from anon/authenticated — only the cron job / service role runs it.
-- NOTE: deleting a storage.objects row removes the object from Storage listings
-- and the signed-URL route; underlying blob GC is handled by Storage itself.
-- ----------------------------------------------------------------------------
create or replace function public.purge_expired_trashed_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expired uuid[];
begin
  select array_agg(id) into expired
  from public.document_files
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';

  if expired is null then
    return;
  end if;

  delete from storage.objects o
  using public.document_files f
  where f.id = any(expired)
    and o.bucket_id = 'library'
    and o.name = f.storage_path;

  delete from public.document_files
  where id = any(expired);
end;
$$;

revoke all on function public.purge_expired_trashed_documents() from public, anon, authenticated;

create extension if not exists pg_cron;

-- Daily at 03:30 (cron.schedule upserts by job name → idempotent re-apply).
select cron.schedule(
  'purge-expired-trashed-documents',
  '30 3 * * *',
  $$select public.purge_expired_trashed_documents()$$
);

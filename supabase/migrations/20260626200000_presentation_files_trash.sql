-- D-078 — Trash (soft-delete) for Presentation Hub files, 30-day retention.
-- Mirrors D-076 (document_files). Additive + nullable. Normal listings filter
-- `deleted_at IS NULL` (on top of the existing `NOT is_archived` version filter).
-- A daily pg_cron job purges items >30 days, removing EVERY storage object a
-- presentation owns: source + thumbnail + each slide in slide_paths[].

alter table public.presentation_files
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists presentation_files_deleted_at_idx
  on public.presentation_files (deleted_at desc) where deleted_at is not null;
-- Live in-folder listing fast path: current version, not trashed.
create index if not exists presentation_files_folder_live_idx
  on public.presentation_files (folder_id, sort_order, created_at, id)
  where not is_archived and deleted_at is null;

create or replace function public.purge_expired_trashed_presentations()
returns void language plpgsql security definer set search_path = public as $$
declare expired uuid[];
begin
  select array_agg(id) into expired
  from public.presentation_files
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';

  if expired is null then
    return;
  end if;

  -- A presentation owns several objects: the source, the thumbnail, and one WebP
  -- per slide. Remove them all from the presentations bucket.
  delete from storage.objects o
  using (
    select storage_path as p from public.presentation_files where id = any(expired)
    union all
    select thumbnail_path from public.presentation_files
      where id = any(expired) and thumbnail_path is not null
    union all
    select unnest(slide_paths) from public.presentation_files where id = any(expired)
  ) paths
  where o.bucket_id = 'presentations' and o.name = paths.p;

  delete from public.presentation_files where id = any(expired);
end; $$;

revoke all on function public.purge_expired_trashed_presentations() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-trashed-presentations',
  '45 3 * * *',
  $$select public.purge_expired_trashed_presentations()$$
);

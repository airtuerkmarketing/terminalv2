-- D-079 — Presentation Hub folder visibility (public/private), 1:1 with the
-- Document Library (D-052 model). The hub stays login-only; "private" now means
-- ADMIN-ONLY (vs visible to every authenticated user). Additive + default TRUE so
-- existing folders stay visible (non-breaking); admins toggle specific folders
-- private via setFolderVisibility.

alter table public.presentation_folders
  add column if not exists is_public boolean not null default true;

-- Folders: visible if public OR the viewer is an admin (mirrors document_folders).
drop policy if exists presentation_folders_select on public.presentation_folders;
create policy presentation_folders_select on public.presentation_folders
  for select to authenticated
  using (is_public or public.is_admin());

-- Files: visible only when their folder is visible (public) or the viewer is an
-- admin — so a private folder hides its presentations from non-admins too. The
-- serving route mints signed URLs only AFTER this RLS-gated row read, so private
-- files are unreachable for non-admins.
drop policy if exists presentation_files_select on public.presentation_files;
create policy presentation_files_select on public.presentation_files
  for select to authenticated
  using (
    exists (
      select 1 from public.presentation_folders f
      where f.id = presentation_files.folder_id
        and (f.is_public or public.is_admin())
    )
  );

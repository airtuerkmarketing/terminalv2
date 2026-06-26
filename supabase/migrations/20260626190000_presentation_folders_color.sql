-- D-077 — persistent, shared per-folder colour for the Presentation Hub.
-- Mirrors D-074 (document_folders.color). Additive + nullable → no-op for existing
-- rows; UI renders NULL as the default (grey). Colour VALUES live in CSS; the DB +
-- the FOLDER_COLORS enum store only the identifier. Admin-writable via setFolderColor.

alter table public.presentation_folders
  add column if not exists color text;

alter table public.presentation_folders
  drop constraint if exists presentation_folders_color_chk;

alter table public.presentation_folders
  add constraint presentation_folders_color_chk
  check (color is null or color in ('grey', 'blue', 'green', 'yellow'));

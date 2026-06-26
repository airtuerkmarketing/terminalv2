-- D-074 — persistent, shared per-folder colour for the Document Library.
--
-- Additive + nullable: existing rows stay NULL and the UI renders NULL as the
-- default (grey), so this is a no-op for current data. Replaces the old
-- per-device localStorage colour with a shared folder property (admin-writable
-- via the setFolderColor server action).
--
-- The colour VALUES live in CSS (src/styles/document-library.css —
-- .dl-folder-fx[data-color=…] + --folder-swatch-* vars). The DB only stores the
-- enum, kept in lock-step with FOLDER_COLORS in src/lib/documents-constants.ts.
-- To add a colour: extend the CHECK below, that constant, and add one CSS block.

alter table public.document_folders
  add column if not exists color text;

alter table public.document_folders
  drop constraint if exists document_folders_color_chk;

alter table public.document_folders
  add constraint document_folders_color_chk
  check (color is null or color in ('grey', 'blue', 'green', 'yellow'));

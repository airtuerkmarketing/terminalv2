-- ============================================================================
-- 20260627120000_fk_covering_indexes.sql
-- ============================================================================
-- D-083 — Performance: covering indexes for the 26 unindexed foreign keys
-- flagged by the Supabase performance advisor (spec/HEALTH_CHECK_2026-06-27.md §6).
--
-- An FK without an index on the referencing column forces a child-table scan on
-- referenced-row delete/update and slows joins on the FK. All 26 are additive,
-- idempotent (IF NOT EXISTS), and lock only briefly (small tables).
--
-- Applied to prod via execute_sql + an explicit schema_migrations row at version
-- 20260627120000 (controlled ordering: MUST sort AFTER folder_permissions
-- 20260627090000, which creates document_/presentation_folder_permissions; the MCP
-- apply_migration would auto-stamp ~07:00 and sort it before those tables exist).
-- Reversible: drop index if exists <name>; for each.
-- ============================================================================

create index if not exists ai_corrections_applied_to_chunk_id_idx on public.ai_corrections (applied_to_chunk_id);
create index if not exists ai_corrections_message_id_idx          on public.ai_corrections (message_id);
create index if not exists ai_corrections_session_id_idx          on public.ai_corrections (session_id);
create index if not exists brand_chunks_block_id_idx              on public.brand_chunks (block_id);
create index if not exists brand_chunks_page_id_idx               on public.brand_chunks (page_id);
create index if not exists brands_logo_asset_id_idx               on public.brands (logo_asset_id);
create index if not exists chunk_edit_log_edited_by_idx           on public.chunk_edit_log (edited_by);
create index if not exists chunk_edit_log_source_correction_id_idx on public.chunk_edit_log (source_correction_id);
create index if not exists company_context_created_by_idx         on public.company_context (created_by);
create index if not exists document_files_deleted_by_idx          on public.document_files (deleted_by);
create index if not exists document_files_uploaded_by_idx         on public.document_files (uploaded_by);
create index if not exists document_folder_permissions_granted_by_idx on public.document_folder_permissions (granted_by);
create index if not exists document_folders_created_by_idx        on public.document_folders (created_by);
create index if not exists documents_asset_id_idx                 on public.documents (asset_id);
create index if not exists documents_preview_asset_id_idx         on public.documents (preview_asset_id);
create index if not exists pages_og_asset_id_idx                  on public.pages (og_asset_id);
create index if not exists presentation_files_deleted_by_idx      on public.presentation_files (deleted_by);
create index if not exists presentation_files_uploaded_by_idx     on public.presentation_files (uploaded_by);
create index if not exists presentation_folder_permissions_granted_by_idx on public.presentation_folder_permissions (granted_by);
create index if not exists presentation_folders_created_by_idx    on public.presentation_folders (created_by);
create index if not exists tag_suggestions_merged_into_idx        on public.tag_suggestions (merged_into);
create index if not exists tag_suggestions_reviewed_by_idx        on public.tag_suggestions (reviewed_by);
create index if not exists tag_vocabulary_approved_by_idx         on public.tag_vocabulary (approved_by);
create index if not exists tag_vocabulary_created_by_idx          on public.tag_vocabulary (created_by);
create index if not exists tag_vocabulary_parent_id_idx           on public.tag_vocabulary (parent_id);
create index if not exists team_members_avatar_asset_id_idx       on public.team_members (avatar_asset_id);

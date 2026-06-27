-- ============================================================================
-- 20260628110000_tighten_rag_knowledge_writes.sql
-- ============================================================================
-- D-087 — Security: tighten rag-knowledge bucket writes to admin-only.
--
-- Health-check §8 flagged that any `authenticated` user could INSERT/UPDATE/DELETE
-- objects in the private `rag-knowledge` bucket. Read stays authenticated (intended —
-- staff knowledge base); writes now require public.is_admin().
--
-- Applied to prod via execute_sql + an explicit schema_migrations row at version
-- 20260628110000 (controlled-timestamp pattern, D-081). Reversible: restore the
-- bucket_id-only `rag_knowledge_auth_{insert,update,delete}` policies.
-- ============================================================================

drop policy if exists rag_knowledge_auth_insert on storage.objects;
drop policy if exists rag_knowledge_auth_update on storage.objects;
drop policy if exists rag_knowledge_auth_delete on storage.objects;

create policy rag_knowledge_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rag-knowledge' and public.is_admin());

create policy rag_knowledge_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'rag-knowledge' and public.is_admin())
  with check (bucket_id = 'rag-knowledge' and public.is_admin());

create policy rag_knowledge_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'rag-knowledge' and public.is_admin());

-- rag_knowledge_auth_select (read) intentionally left unchanged.

-- Knowledge Base (Wissensbasis) foundation — D-065/D-066/D-068.
--
-- Additive only. Four new tables + a `tags` column on company_context (the SOLE
-- durable editable layer per Decision D-A — confluence/brand chunks are
-- regenerable caches and stay read-only). RLS is enforced via is_super_admin();
-- NO `WITH CHECK (true)` anywhere. Service-role writes (edge functions, audit
-- log) bypass RLS by design, so those tables intentionally have no authenticated
-- write policy. Reviewers (admin|super_admin) already hold UPDATE on
-- ai_corrections (corrections_admin_review) — not touched here.

-- ───────────────────────────────────────────────────────────────────────────
-- 1 · tag_vocabulary — single source of truth for the 5 tag axes
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.tag_vocabulary (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  axis        text NOT NULL CHECK (axis IN ('topic','airline','department','provider','brand')),
  value       text NOT NULL,
  label_de    text NOT NULL,
  label_en    text,
  parent_id   uuid REFERENCES public.tag_vocabulary(id) ON DELETE SET NULL,
  aliases     text[] NOT NULL DEFAULT '{}',
  description text,
  cited_count integer NOT NULL DEFAULT 0,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (axis, value)
);
CREATE INDEX idx_tag_vocabulary_axis ON public.tag_vocabulary (axis, value);

-- ───────────────────────────────────────────────────────────────────────────
-- 2 · tag_suggestions — AI-proposed new tags awaiting super_admin review
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.tag_suggestions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  axis               text NOT NULL CHECK (axis IN ('topic','airline','department','provider','brand')),
  suggested_value    text NOT NULL,
  source_chunk_id    text,                 -- text: company_context.id is uuid, chunk ids are bigint
  source_chunk_table text,
  context_excerpt    text,
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected','merged')),
  reviewed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at        timestamptz,
  merged_into        uuid REFERENCES public.tag_vocabulary(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tag_suggestions_status ON public.tag_suggestions (status, created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 3 · chunk_edit_log — audit trail for every content/tag edit (Audit-Drawer)
--     chunk_id is text to span uuid (company_context) and bigint (chunk tables).
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.chunk_edit_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_table          text NOT NULL,
  chunk_id             text NOT NULL,
  edited_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edit_reason          text NOT NULL,
  diff_before          text,
  diff_after           text,
  tags_before          jsonb,
  tags_after           jsonb,
  source_correction_id uuid REFERENCES public.ai_corrections(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chunk_edit_log_chunk ON public.chunk_edit_log (chunk_table, chunk_id, created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 4 · chunk_retrieval_stats — "Abgerufen ×N" rollup (idea-3), namespaced key.
--     Populated by a nightly job exploding ai_chat_messages.retrieved_chunks.
--     Labelled "Abgerufen" (retrieved), NOT "Zitiert" — it counts retrieval, not
--     model citation.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.chunk_retrieval_stats (
  source            text NOT NULL CHECK (source IN ('context','confluence','brand')),
  source_id         text NOT NULL,
  retrieved_count   integer NOT NULL DEFAULT 0,
  last_retrieved_at timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, source_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5 · company_context.tags — sole durable editable layer (D-A). GIN for filters.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.company_context ADD COLUMN tags jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX idx_company_context_tags ON public.company_context USING gin (tags);

-- ───────────────────────────────────────────────────────────────────────────
-- 6 · RLS — super_admin reads via authenticated; service-role writes bypass RLS.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tag_vocabulary        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_suggestions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunk_edit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunk_retrieval_stats ENABLE ROW LEVEL SECURITY;

-- tag_vocabulary: super_admin reads (Tab 4 dropdowns) + full CRUD.
CREATE POLICY tag_vocab_select_super_admin ON public.tag_vocabulary
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY tag_vocab_mutate_super_admin ON public.tag_vocabulary
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- tag_suggestions: super_admin reads + reviews. Inserts come from the
-- tag-classify edge function via the service role (RLS-bypassing).
CREATE POLICY tag_sug_select_super_admin ON public.tag_suggestions
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY tag_sug_update_super_admin ON public.tag_suggestions
  FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY tag_sug_delete_super_admin ON public.tag_suggestions
  FOR DELETE TO authenticated USING (is_super_admin());

-- chunk_edit_log: super_admin reads. Writes via the service role (server actions
-- using the admin client), mirroring user_activity_log.
CREATE POLICY chunk_log_select_super_admin ON public.chunk_edit_log
  FOR SELECT TO authenticated USING (is_super_admin());

-- chunk_retrieval_stats: super_admin reads. Writes via the service role (nightly).
CREATE POLICY chunk_stats_select_super_admin ON public.chunk_retrieval_stats
  FOR SELECT TO authenticated USING (is_super_admin());

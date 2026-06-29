-- Add observability columns to ai_chat_messages
--
-- Adds 3 nullable columns for AI turn observability tracking:
--   mode        - chat mode classification per turn
--   tool_calls  - jsonb array of tools invoked (canonical source,
--                 superseding retrieved_chunks.metadata.calls hack)
--   ttft_ms     - time to first content_block_delta, distinct
--                 from existing latency_ms (end-to-end)
--
-- Existing observability columns unchanged:
--   model, tokens_in, tokens_out, latency_ms, user_feedback

ALTER TABLE ai_chat_messages
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS tool_calls jsonb,
  ADD COLUMN IF NOT EXISTS ttft_ms integer;

COMMENT ON COLUMN ai_chat_messages.mode IS
  'Chat mode for this turn: default | translate | summarize | escalation | web-search';

COMMENT ON COLUMN ai_chat_messages.tool_calls IS
  'jsonb array of tools invoked during generation. Canonical source for tool invocation history (supersedes retrieved_chunks.metadata.calls hack).';

COMMENT ON COLUMN ai_chat_messages.ttft_ms IS
  'Time to first content_block_delta in milliseconds. Distinct from latency_ms (end-to-end).';

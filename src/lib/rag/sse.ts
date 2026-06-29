// Pure SSE-line parser for the rag-query stream.
//
// Deliberately dependency-free (no `@/` aliases, no imports) so it runs under plain
// `node` for the unit test (scripts/test-sse-parser.ts) and so the pause_turn parsing
// contract is testable without a network or the browser Supabase client. client.ts
// consumes this; the test asserts it directly.

export type ParsedSse =
  | { kind: "text"; text: string }
  | { kind: "paused"; reason: string }
  | { kind: "stop" }
  | null;

/** Classify one SSE line from the rag-query stream. Returns `null` for lines to
 * ignore (comments, blanks, `[DONE]`, partial JSON across a chunk boundary, or any
 * event type the client does not act on). */
export function parseSseLine(line: string): ParsedSse {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  if (!payload || payload === "[DONE]") return null;
  let evt: { type?: string; delta?: { text?: string }; reason?: unknown };
  try {
    evt = JSON.parse(payload);
  } catch {
    return null; // partial JSON across a chunk boundary — ignore
  }
  if (evt.type === "content_block_delta" && evt.delta?.text) {
    return { kind: "text", text: evt.delta.text };
  }
  if (evt.type === "paused") {
    // `reason` is an open string per the Anthropic API (future pause_turn reasons
    // may appear); the client only keys on the type, reason is logging/UX text.
    return { kind: "paused", reason: typeof evt.reason === "string" ? evt.reason : "unknown" };
  }
  if (evt.type === "message_stop") {
    return { kind: "stop" };
  }
  return null;
}

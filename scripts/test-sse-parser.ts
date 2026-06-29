// scripts/test-sse-parser.ts — Phase 4 (D-106 follow-up): pure unit test for the
// rag-query SSE line parser (src/lib/rag/sse.ts). No network, no env, no Supabase.
//
// Run with Node's native TypeScript (the eval-harness convention — `npx tsx` fails on
// ESM top-level await; plain node detects ESM and strips types):
//   node scripts/test-sse-parser.ts
// (Exits non-zero on any failed assertion so CI / a gate can detect regressions.)

import { parseSseLine, type ParsedSse } from "../src/lib/rag/sse.ts";

let failures = 0;
function assert(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

// A synthetic SSE stream as the edge function emits it: text deltas, then the
// pause_turn signal, then the single message_stop — interleaved with the noise lines
// the parser must ignore (blank frame separators, comments, [DONE], unrelated events).
const stream: string[] = [
  'data: {"type":"content_block_delta","delta":{"text":"Hello "}}',
  'data: {"type":"content_block_delta","delta":{"text":"world"}}',
  'data: {"type":"paused","reason":"max_searches_reached"}',
  'data: {"type":"message_stop"}',
  "", // blank line between SSE frames
  ": keep-alive", // SSE comment line
  "data: [DONE]", // terminal sentinel
  'data: {"type":"content_block_start","index":0}', // unrelated event
];

const out: ParsedSse[] = stream.map(parseSseLine);

assert("first text delta parses", out[0]?.kind === "text" && out[0].text === "Hello ", out[0]);
assert("second text delta parses", out[1]?.kind === "text" && out[1].text === "world", out[1]);

const paused = out[2];
assert("paused event recognized", paused?.kind === "paused", paused);
assert(
  "paused reason carried through",
  paused?.kind === "paused" && paused.reason === "max_searches_reached",
  paused,
);

assert("message_stop → stop", out[3]?.kind === "stop", out[3]);
assert("blank line ignored", out[4] === null, out[4]);
assert("comment line ignored", out[5] === null, out[5]);
assert("[DONE] ignored", out[6] === null, out[6]);
assert("unrelated event ignored", out[7] === null, out[7]);

// Open-string contract: a paused event with no reason defaults to "unknown".
const noReason = parseSseLine('data: {"type":"paused"}');
assert(
  'paused without reason defaults to "unknown"',
  noReason?.kind === "paused" && noReason.reason === "unknown",
  noReason,
);

// Partial-JSON tolerance (chunk boundary): malformed payload → ignored, not thrown.
assert("malformed JSON ignored", parseSseLine('data: {"type":"pau') === null);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
if (failures > 0) process.exitCode = 1;

// scripts/rag-eval.ts
// D-099 — RAG eval/regression harness.
//
// Replays the gold-set questions through the LIVE rag-query edge function, then
// LLM-judges each fresh answer against the 2026-06-22 human baseline stored in
// gold_set_answers. Produces a pass-rate AND a *direction* signal:
//   - regression  = was 'richtig' on 2026-06-22, now wrong/refused
//   - fixed       = was 'falsch' on 2026-06-22, now correct (matches korrektur)
//   - still_wrong = was 'falsch', still wrong
//   - correct     = was 'richtig', still correct
// This is the first repeatable quality gate — before it, "92.9%" was a single
// human pass with no way to detect a regression after a prompt/rerank/chunk change.
//
// Run with Node's native TypeScript (Node >= 23.6) + --env-file:
//   Smoke (3 Qs, no cleanup skip):  node --env-file=.env.local scripts/rag-eval.ts --limit 3
//   Full baseline:                  node --env-file=.env.local scripts/rag-eval.ts
//   Dry (fetch gold set only):      node --env-file=.env.local scripts/rag-eval.ts --dry-run
//   Keep the created sessions:      node --env-file=.env.local scripts/rag-eval.ts --keep-sessions
//
// Required env (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
//   SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD.
//
// Side effects: each replayed question creates 1 ai_chat_session + 2 ai_chat_messages
// in prod (the edge fn logs before retrieval). The harness captures every X-Session-Id
// and DELETEs those exact rows at the end (unless --keep-sessions). Cleanup runs before
// the 03:15 chunk_retrieval_stats rollup, so eval traffic never pollutes the stats.
//
// NOTE: exits naturally (no process.exit on success) — process.exit() on Windows can
// race the supabase keep-alive socket and trip a libuv teardown assertion.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

// ---------- config / args ----------
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const KEEP_SESSIONS = args.includes("--keep-sessions");
const limitArg = args.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1] ?? "0", 10) : 0;
const RAG_CONCURRENCY = 4;
const JUDGE_CONCURRENCY = 4;
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const OUT_DIR =
  process.env.RAG_EVAL_OUT_DIR ??
  "C:\\Users\\MARKET~1\\AppData\\Local\\Temp\\claude\\D--terminal-V2\\1d34f5c7-f7e8-4875-9175-3a77b9bd815a\\scratchpad";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

// ---------- types ----------
interface GoldRow {
  id: number;
  frage_nr: number;
  frage_text: string;
  vorgeschlagene_antwort: string | null;
  bewertung: string | null; // 'richtig' | 'falsch' | null
  korrektur: string | null;
  test_set: string;
}
interface ReplayResult {
  row: GoldRow;
  answer: string;
  sessionId: string;
  latencyMs: number;
  weissNicht: boolean;
  httpStatus: number;
  errored: boolean;
}
type Verdict = "pass" | "fail" | "uncertain";
type Category = "correct" | "regression" | "fixed" | "still_wrong" | "uncertain";
interface Judgement {
  verdict: Verdict;
  category: Category;
  reason: string;
}

// ---------- small concurrency pool ----------
async function pool<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const cur = idx++;
      out[cur] = await fn(items[cur], cur);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return out;
}

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
}
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

// ---------- replay one question through the live edge fn ----------
async function replay(row: GoldRow, userToken: string): Promise<ReplayResult> {
  const url = `${SUPABASE_URL}/functions/v1/rag-query`;
  const started = Date.now();
  const base: ReplayResult = {
    row,
    answer: "",
    sessionId: "",
    latencyMs: 0,
    weissNicht: false,
    httpStatus: 0,
    errored: false,
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ question: row.frage_text, mode: "default" }),
    });
    base.httpStatus = res.status;
    base.sessionId = res.headers.get("X-Session-Id") ?? "";
    base.weissNicht = res.headers.get("X-Weiss-Nicht") === "true";
    if (!res.ok || !res.body) {
      base.errored = true;
      base.answer = `[HTTP ${res.status}] ${await res.text().catch(() => "")}`.slice(0, 500);
      base.latencyMs = Date.now() - started;
      return base;
    }
    // Mirror src/lib/rag/client.ts: accumulate content_block_delta.delta.text.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    const handleLine = (line: string) => {
      if (!line.startsWith("data: ")) return;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") return;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "content_block_delta" && evt.delta?.text) full += evt.delta.text;
      } catch {
        /* partial JSON across chunk boundary */
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer) buffer.split("\n").forEach(handleLine);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    }
    base.answer = full;
    base.latencyMs = Date.now() - started;
    if (!full.trim()) base.errored = true;
    return base;
  } catch (err) {
    base.errored = true;
    base.answer = `[fetch error] ${String(err)}`;
    base.latencyMs = Date.now() - started;
    return base;
  }
}

// ---------- LLM judge ----------
function buildJudgePrompt(r: ReplayResult): string {
  const wasRight = (r.row.bewertung ?? "").toLowerCase() === "richtig";
  const reference = r.row.vorgeschlagene_antwort ?? "(keine)";
  const korrektur = r.row.korrektur?.trim() ? r.row.korrektur : "(keine Korrektur hinterlegt)";
  return `Du bist ein strenger, neutraler Gutachter für die Qualität einer internen RAG-KI (airtuerk Service GmbH, B2B-Flugkonsolidierung). Beurteile NUR die fachliche Richtigkeit, nicht den Stil.

FRAGE:
${r.row.frage_text}

REFERENZ-ANTWORT (vom 2026-06-22, menschlich bewertet als "${wasRight ? "RICHTIG" : "FALSCH"}"):
${reference}

${wasRight
  ? `Diese Referenz wurde als RICHTIG bewertet. Die NEUE Antwort gilt als PASS, wenn sie dieselbe Kern-Information korrekt vermittelt (Formulierung darf abweichen). FAIL, wenn sie der Referenz fachlich widerspricht, die Kern-Information weglässt, oder fälschlich ablehnt ("weiß nicht").`
  : `Diese Referenz wurde als FALSCH bewertet. Die korrekte Information lautet:
KORREKTUR: ${korrektur}
Die NEUE Antwort gilt als PASS, wenn sie jetzt die korrekte Information (gemäß Korrektur) liefert und den alten Fehler vermeidet. FAIL, wenn sie den alten Fehler wiederholt oder weiterhin falsch ist.`}

NEUE ANTWORT (live, heute):
${r.answer || "(leer)"}

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, keine Erklärung davor/danach:
{"verdict":"pass|fail|uncertain","reason":"<max 25 Wörter, deutsch>"}`;
}

async function judge(r: ReplayResult): Promise<Judgement> {
  const wasRight = (r.row.bewertung ?? "").toLowerCase() === "richtig";
  const fallbackCat: Category = wasRight ? "correct" : "still_wrong";
  if (r.errored) {
    return { verdict: "fail", category: wasRight ? "regression" : "still_wrong", reason: `Replay-Fehler: ${r.answer.slice(0, 80)}` };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY!,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: buildJudgePrompt(r) }],
      }),
    });
    if (!res.ok) {
      return { verdict: "uncertain", category: "uncertain", reason: `Judge HTTP ${res.status}` };
    }
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { verdict: "uncertain", category: "uncertain", reason: "Judge: kein JSON" };
    const parsed = JSON.parse(match[0]) as { verdict?: string; reason?: string };
    const verdict: Verdict =
      parsed.verdict === "pass" ? "pass" : parsed.verdict === "fail" ? "fail" : "uncertain";
    let category: Category;
    if (verdict === "uncertain") category = "uncertain";
    else if (wasRight) category = verdict === "pass" ? "correct" : "regression";
    else category = verdict === "pass" ? "fixed" : "still_wrong";
    return { verdict, category, reason: (parsed.reason ?? "").slice(0, 200) };
  } catch (err) {
    return { verdict: "uncertain", category: fallbackCat === "correct" ? "uncertain" : "uncertain", reason: `Judge-Fehler: ${String(err).slice(0, 80)}` };
  }
}

// ---------- main ----------
async function main(): Promise<void> {
  for (const [k, v] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: SECRET_KEY,
    ANTHROPIC_API_KEY: ANTHROPIC_KEY,
    TEST_USER_EMAIL: TEST_EMAIL,
    TEST_USER_PASSWORD: TEST_PASSWORD,
  })) {
    if (!v && !(DRY_RUN && (k === "ANTHROPIC_API_KEY" || k === "TEST_USER_EMAIL" || k === "TEST_USER_PASSWORD"))) {
      console.error(`FEHLER: env ${k} fehlt.`);
      process.exitCode = 1;
      return;
    }
  }

  const service = createClient(SUPABASE_URL!, SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch gold set (service-role; bypasses RLS).
  const { data: goldRaw, error: goldErr } = await service
    .from("gold_set_answers")
    .select("id, frage_nr, frage_text, vorgeschlagene_antwort, bewertung, korrektur, test_set")
    .order("test_set", { ascending: true })
    .order("frage_nr", { ascending: true });
  if (goldErr || !goldRaw) {
    console.error("FEHLER beim Laden des Gold-Sets:", goldErr?.message);
    process.exitCode = 1;
    return;
  }
  let gold = goldRaw as GoldRow[];
  const total = gold.length;
  if (LIMIT > 0) gold = gold.slice(0, LIMIT);

  const setCounts = gold.reduce<Record<string, number>>((acc, r) => {
    acc[r.test_set] = (acc[r.test_set] ?? 0) + 1;
    return acc;
  }, {});
  const baselineRight = gold.filter((r) => (r.bewertung ?? "").toLowerCase() === "richtig").length;
  const baselineWrong = gold.filter((r) => (r.bewertung ?? "").toLowerCase() === "falsch").length;

  console.log(`\n=== RAG eval harness (D-099) ${DRY_RUN ? "[DRY RUN]" : ""} ===`);
  console.log(`Gold set: ${total} rows total, running ${gold.length}${LIMIT ? ` (--limit ${LIMIT})` : ""}.`);
  console.log(`Test sets: ${Object.entries(setCounts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`2026-06-22 baseline (this slice): ${baselineRight} richtig / ${baselineWrong} falsch.`);
  console.log(`Judge model: ${JUDGE_MODEL}. RAG concurrency: ${RAG_CONCURRENCY}.`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — gold set loaded, no replay/judge. Re-run without --dry-run.\n");
    return;
  }

  // Auth as the test user → user JWT for the edge fn.
  const authClient = createClient(SUPABASE_URL!, PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signErr } = await authClient.auth.signInWithPassword({
    email: TEST_EMAIL!,
    password: TEST_PASSWORD!,
  });
  if (signErr || !signIn.session) {
    console.error("FEHLER beim Login des Test-Users:", signErr?.message);
    process.exitCode = 1;
    return;
  }
  const userToken = signIn.session.access_token;
  console.log(`Authenticated as ${TEST_EMAIL}.`);

  // 1) Replay through the live edge fn.
  console.log(`\nReplaying ${gold.length} questions through live rag-query…`);
  const tReplay = Date.now();
  let doneCount = 0;
  const results = await pool(gold, RAG_CONCURRENCY, async (row) => {
    const r = await replay(row, userToken);
    doneCount++;
    if (doneCount % 10 === 0 || doneCount === gold.length) {
      console.log(`  ${doneCount}/${gold.length} replayed`);
    }
    return r;
  });
  console.log(`Replay done in ${((Date.now() - tReplay) / 1000).toFixed(0)}s.`);

  // 2) Judge.
  console.log(`\nJudging ${results.length} answers (${JUDGE_MODEL})…`);
  const judgements = await pool(results, JUDGE_CONCURRENCY, (r) => judge(r));

  // 3) Aggregate.
  const rows = results.map((r, i) => ({ r, j: judgements[i] }));
  const cat = (c: Category) => rows.filter((x) => x.j.category === c).length;
  const correct = cat("correct");
  const regression = cat("regression");
  const fixed = cat("fixed");
  const stillWrong = cat("still_wrong");
  const uncertain = cat("uncertain");
  const passes = rows.filter((x) => x.j.verdict === "pass").length;
  const httpErrors = results.filter((x) => x.errored).length;
  const weissNicht = results.filter((x) => x.weissNicht).length;
  const lat = results.map((x) => x.latencyMs).sort((a, b) => a - b);

  console.log(`\n================ RAG EVAL RESULT ================`);
  console.log(`Pass rate (live):     ${passes}/${rows.length}  (${pct(passes, rows.length)})`);
  console.log(`  correct (stayed right):  ${correct}/${baselineRight} of the prior 'richtig'`);
  console.log(`  REGRESSION (right→wrong): ${regression}   <-- watch`);
  console.log(`  fixed (wrong→right):     ${fixed}/${baselineWrong} of the prior 'falsch'`);
  console.log(`  still_wrong:             ${stillWrong}`);
  console.log(`  uncertain (judge):       ${uncertain}`);
  console.log(`Replay errors/empty:  ${httpErrors}   weiss-nicht: ${weissNicht}`);
  console.log(`Latency ms  p50=${percentile(lat, 50)}  p95=${percentile(lat, 95)}  max=${lat[lat.length - 1] ?? 0}`);

  // Per-test-set breakdown.
  console.log(`\nPer test set:`);
  for (const ts of Object.keys(setCounts)) {
    const sub = rows.filter((x) => x.r.row.test_set === ts);
    const p = sub.filter((x) => x.j.verdict === "pass").length;
    console.log(`  ${ts}: ${p}/${sub.length} pass (${pct(p, sub.length)})`);
  }

  // Spotlight: regressions + still_wrong (the actionable lists).
  const flag = rows.filter((x) => x.j.category === "regression" || x.j.category === "still_wrong");
  if (flag.length) {
    console.log(`\n--- Flagged (${flag.length}): regressions + still-wrong ---`);
    for (const x of flag) {
      console.log(`  [${x.j.category}] #${x.r.row.frage_nr} (${x.r.row.test_set}) ${x.r.row.frage_text.slice(0, 70)}`);
      console.log(`     → ${x.j.reason}`);
    }
  }

  // 4) Write full artifact JSON (raw answers — NOT committed; lives in scratchpad).
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = `${OUT_DIR}\\rag-eval-${stamp}.json`;
  const artifact = {
    judge_model: JUDGE_MODEL,
    ran: gold.length,
    total_gold: total,
    summary: { passes, correct, regression, fixed, stillWrong, uncertain, httpErrors, weissNicht },
    latency: { p50: percentile(lat, 50), p95: percentile(lat, 95), max: lat[lat.length - 1] ?? 0 },
    perSet: Object.keys(setCounts).map((ts) => {
      const sub = rows.filter((x) => x.r.row.test_set === ts);
      return { test_set: ts, pass: sub.filter((x) => x.j.verdict === "pass").length, n: sub.length };
    }),
    items: rows.map((x) => ({
      frage_nr: x.r.row.frage_nr,
      test_set: x.r.row.test_set,
      bewertung_2026_06_22: x.r.row.bewertung,
      frage: x.r.row.frage_text,
      referenz: x.r.row.vorgeschlagene_antwort,
      korrektur: x.r.row.korrektur,
      neue_antwort: x.r.answer,
      latency_ms: x.r.latencyMs,
      weiss_nicht: x.r.weissNicht,
      verdict: x.j.verdict,
      category: x.j.category,
      reason: x.j.reason,
    })),
  };
  try {
    writeFileSync(outPath, JSON.stringify(artifact, null, 2), "utf8");
    console.log(`\nFull artifact: ${outPath}`);
  } catch (err) {
    console.error(`WARN: konnte Artifact nicht schreiben: ${String(err)}`);
  }

  // 5) Cleanup the prod sessions/messages this run created.
  const sessionIds = [...new Set(results.map((x) => x.sessionId).filter(Boolean))];
  if (KEEP_SESSIONS) {
    console.log(`\n--keep-sessions: leaving ${sessionIds.length} eval sessions in place.`);
  } else if (sessionIds.length) {
    const { error: delMsgErr } = await service.from("ai_chat_messages").delete().in("session_id", sessionIds);
    const { error: delSesErr } = await service.from("ai_chat_sessions").delete().in("id", sessionIds);
    if (delMsgErr || delSesErr) {
      console.error(`WARN cleanup: messages=${delMsgErr?.message ?? "ok"} sessions=${delSesErr?.message ?? "ok"}`);
      console.error(`  Manual cleanup IDs: ${sessionIds.join(", ")}`);
    } else {
      console.log(`\nCleaned up ${sessionIds.length} eval sessions + their messages.`);
    }
  }

  console.log(`\nDone.\n`);
}

await main();

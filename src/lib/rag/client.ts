// RAG client — talks to the rag-query edge function + ai_chat/correction tables.
// C12: reuse the repo's browser Supabase wrapper. Turn-based: SearchAIBox drives
// streaming per AiTurn; this lib stays UI-agnostic.
import { createClient } from "@/lib/supabase/client";
import type { AiSource, AiKonfidenz, AiTurn } from "@/lib/search/types";
// Type-only import: erased at compile, so the server-only users.ts module is NOT
// pulled into the client bundle.
import type { ChatMessageItem } from "@/lib/users";

const RAG_QUERY_PATH = "/functions/v1/rag-query";

export interface RagSource {
  source: "context" | "confluence" | "brand";
  source_id: string;
  metadata: {
    title?: string;
    bereich?: string;
    kanal?: string;
    source_url?: string;
    topic?: string;
    category?: string;
    brand_name?: string;
    priority?: number;
    source_type?: string;
    section_title?: string;
  };
  combined_score: number;
  rerank_score?: number;
}

export interface RagStreamEvent {
  type: "text" | "session" | "message" | "done" | "error";
  text?: string;
  sessionId?: string;
  messageId?: number;
  weissNicht?: boolean;
  error?: string;
}

export interface RagQueryOptions {
  question: string;
  sessionId?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  /** KI sub-mode (mode-chips). "default" = normal RAG; others switch the system
   * prompt in rag-query (v12+). Older edge fn versions ignore this field. */
  mode?: string;
  onEvent: (e: RagStreamEvent) => void;
  signal?: AbortSignal;
}

/** Stream a question through the RAG pipeline; fires onEvent per chunk + lifecycle. */
export async function ragQueryStream(opts: RagQueryOptions): Promise<{
  finalText: string;
  sessionId: string;
  messageId: number;
}> {
  const { question, sessionId, conversationHistory, mode, onEvent, signal } = opts;
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    onEvent({ type: "error", error: "Not authenticated" });
    throw new Error("Not authenticated");
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${RAG_QUERY_PATH}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      session_id: sessionId,
      conversation_history: conversationHistory ?? [],
      mode: mode ?? "default",
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = res.body ? await res.text() : `HTTP ${res.status}`;
    onEvent({ type: "error", error: `rag-query failed: ${res.status} ${detail}` });
    throw new Error(`rag-query failed: ${res.status}`);
  }

  // By design: HTTP headers are available the moment fetch() resolves (before the
  // SSE body streams). We fire 'session' + 'message' up front so the caller can
  // store sessionId/messageId in turn-state for CorrectionModal targeting — even
  // if the body stream errors mid-way, the turn already knows its message_id.
  // C5: the edge function exposes these cross-origin via Access-Control-Expose-Headers.
  const returnedSessionId = res.headers.get("X-Session-Id") ?? sessionId ?? "";
  const returnedMessageId = res.headers.get("X-Message-Id");
  const weissNicht = res.headers.get("X-Weiss-Nicht") === "true";
  if (returnedSessionId) onEvent({ type: "session", sessionId: returnedSessionId });
  if (returnedMessageId) onEvent({ type: "message", messageId: parseInt(returnedMessageId, 10) });

  // 'done' must fire exactly once. message_stop fires it during the stream; the
  // post-loop call is a safety-net for a clean stream end without message_stop
  // (e.g. Anthropic hiccup) — without it the caller would hang in isStreaming.
  let doneFired = false;
  const fireDone = () => {
    if (doneFired) return;
    doneFired = true;
    onEvent({ type: "done", weissNicht });
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const handleLine = (line: string) => {
    if (!line.startsWith("data: ")) return;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const evt = JSON.parse(payload);
      if (evt.type === "content_block_delta" && evt.delta?.text) {
        fullText += evt.delta.text;
        onEvent({ type: "text", text: evt.delta.text });
      } else if (evt.type === "message_stop") {
        fireDone();
      }
    } catch {
      /* partial JSON across chunk boundary — ignore */
    }
  };

  while (true) {
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

  // Safety-net: guarantee 'done' even if message_stop never arrived.
  fireDone();

  return {
    finalText: fullText,
    sessionId: returnedSessionId,
    messageId: returnedMessageId ? parseInt(returnedMessageId, 10) : 0,
  };
}

/** Lazy-load retrieved sources for a message (when not carried in the stream). */
export async function fetchMessageSources(messageId: number): Promise<RagSource[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_chat_messages")
    .select("retrieved_chunks")
    .eq("id", messageId)
    .single();
  if (error || !data?.retrieved_chunks) return [];
  return data.retrieved_chunks as RagSource[];
}

/** 👍 / 👎 on a message. */
export async function submitMessageFeedback(
  messageId: number,
  feedback: "helpful" | "not_helpful",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ai_chat_messages")
    .update({ user_feedback: feedback })
    .eq("id", messageId);
  if (error) throw error;
}

/**
 * Rename one of the caller's own AI-chat sessions. Like the other per-user chat
 * writes here, it goes through the browser RLS client — the `sessions_own_update`
 * policy (user_id = auth.uid()) is the real gate, so a user physically cannot
 * rename someone else's session. Empty/whitespace title → stored as null (the UI
 * falls back to the derived first-question title). Returns the stored value.
 */
export async function renameChatSession(
  sessionId: string,
  title: string,
): Promise<{ title: string | null }> {
  const supabase = createClient();
  const trimmed = title.trim();
  const value = trimmed.length > 0 ? trimmed.slice(0, 120) : null;
  const { error } = await supabase
    .from("ai_chat_sessions")
    .update({ title: value })
    .eq("id", sessionId);
  if (error) throw error;
  return { title: value };
}

export interface CorrectionSubmission {
  sessionId: string;
  messageId: number;
  originalQuestion: string;
  originalAnswer: string;
  proposedCorrection: string;
  correctionType: "factual_error" | "missing_info" | "outdated" | "context_wrong";
  userReference?: string;
}

export async function submitCorrection(sub: CorrectionSubmission): Promise<{ id: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: msg } = await supabase
    .from("ai_chat_messages")
    .select("retrieved_chunks")
    .eq("id", sub.messageId)
    .single();

  const { data, error } = await supabase
    .from("ai_corrections")
    .insert({
      session_id: sub.sessionId,
      message_id: sub.messageId,
      original_question: sub.originalQuestion,
      original_answer: sub.originalAnswer,
      retrieved_chunks: msg?.retrieved_chunks ?? [],
      proposed_correction: sub.proposedCorrection,
      correction_type: sub.correctionType,
      user_reference: sub.userReference,
      submitted_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Best-effort: notify the reviewers (Selin + Murat) by email. Never blocks submit.
  supabase.functions
    .invoke("notify-correction-event", { body: { type: "submitted", correctionId: data.id } })
    .catch(() => {});
  return data;
}

/** Pending-corrections count for the admin badge. */
export async function fetchPendingCorrectionsCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("ai_corrections")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    console.error("pending count failed", error);
    return 0;
  }
  return count ?? 0;
}

// ── Day-2 adaptations (Option A reuse + konfidenz heuristic) ──

/** Map a RAG source onto the existing AiSource shape so AIAnswerBlock renders it
 * unchanged. Correction-sourced chunks surface as "Korrektur" (demo signal that
 * the answer came from an approved correction). */
export function ragToAiSource(s: RagSource): AiSource {
  const isCorrection = s.metadata.source_type === "correction";
  return {
    dokument_titel:
      s.metadata.title ??
      s.metadata.section_title ??
      s.metadata.brand_name ??
      s.metadata.topic ??
      "Quelle",
    domain: isCorrection ? "Korrektur" : s.metadata.source_type ?? s.source,
    quelle: s.source,
    link: s.metadata.source_url ?? "#",
    seite: 0,
    stand: "",
  };
}

/** Detects a rule-7 out-of-scope refusal — the exact phrase the system prompt
 * emits + its fragments. The frontend uses this to hide sources, mark low
 * confidence, and (Workstream 4) offer the web-search fallback. */
export function isOutOfScope(text: string): boolean {
  return (
    /außerhalb meiner Wissensbasis/i.test(text) ||
    /Ich bin airtuerk Intelligence/i.test(text) ||
    /Soll ich im Internet recherchieren/i.test(text)
  );
}

/** Heuristic confidence for the existing konfidenz bars (RAG has no native score).
 * Phase-2 backlog: compute from rerank scores + retrieval count. */
export function inferKonfidenz(text: string, weissNicht: boolean): AiKonfidenz {
  if (weissNicht) return "niedrig";
  if (text.includes("nicht eindeutig hervor")) return "niedrig";
  if (isOutOfScope(text)) return "niedrig";
  if (/\[Quellen?:/.test(text)) return "hoch";
  return "mittel";
}

/** Defensive map of a persisted retrieved_chunks jsonb array (RagSource[] shape,
 *  same as fetchMessageSources reads) to AiSource[]. Malformed chunks are skipped
 *  rather than crashing the render. */
function chunksToSources(chunks: unknown[]): AiSource[] {
  if (!Array.isArray(chunks)) return [];
  const out: AiSource[] = [];
  for (const c of chunks) {
    const s = c as RagSource;
    if (s && typeof s === "object" && s.metadata && typeof s.metadata === "object") {
      try {
        out.push(ragToAiSource(s));
      } catch {
        /* skip a malformed chunk */
      }
    }
  }
  return out;
}

/**
 * Rebuild chat turns from persisted DB messages (B.2 — opening an old chat).
 * Messages arrive chronologically (created_at asc). Each user message pairs with
 * the NEXT assistant message; a user with no following assistant (aborted) is
 * dropped (cleaner than an empty turn). Mirrors the live finalize in SearchAIBox:
 * confidence is RE-INFERRED from the answer text (not stored), sources come from
 * the assistant row's retrieved_chunks, out-of-scope refusals hide their sources.
 *
 * `isStreaming: false` is REQUIRED — AIAnswerBlock treats `isStreaming !== undefined`
 * as "this is a RAG turn" and suppresses the typewriter, so a restored chat renders
 * finished instead of re-typing letter by letter. The turn id is the assistant
 * message id so React keys stay stable across reopens.
 */
export function messagesToTurns(messages: ChatMessageItem[]): AiTurn[] {
  const turns: AiTurn[] = [];
  let question: string | null = null;
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") {
      question = m.content;
      continue;
    }
    // assistant — close the turn with the pending question (drop if none).
    if (question === null) continue;
    const text = m.content;
    const outOfScope = isOutOfScope(text);
    turns.push({
      id: m.id,
      question,
      model: "",
      messageId: Number(m.id),
      isStreaming: false,
      feedback: m.userFeedback,
      weissNicht: outOfScope,
      answer: {
        text,
        quellen: outOfScope ? [] : chunksToSources(m.retrievedChunks),
        konfidenz: inferKonfidenz(text, outOfScope),
        weiss_nicht: outOfScope,
      },
    });
    question = null;
  }
  return turns;
}

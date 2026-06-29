// RAG client — talks to the rag-query edge function + ai_chat/correction tables.
// C12: reuse the repo's browser Supabase wrapper. Turn-based: SearchAIBox drives
// streaming per AiTurn; this lib stays UI-agnostic.
import { createClient } from "@/lib/supabase/client";
import type { AiSource, AiKonfidenz } from "@/lib/search/types";

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

/** Detects a rule-7 out-of-scope refusal across DE/EN/TR. The system prompt now
 * mirrors the protocol phrase into the user's input language (strict-mirroring),
 * so this matches each language's stable anchors — the web-search offer and the
 * "outside my knowledge base" clause. The frontend uses it to hide sources, mark
 * low confidence, and (Workstream 4) offer the web-search fallback.
 *
 * NB: the Turkish web-search regex starts at "nternette" (no leading İ) on purpose
 * — JS case-insensitive matching does not fold the dotted capital İ to "i". */
export function isOutOfScope(text: string): boolean {
  return (
    // Web-search offer — the signal unique to the rule-7 refusal.
    /Soll ich im Internet recherchieren/i.test(text) || // DE
    /search the web/i.test(text) || // EN
    /nternette ara[şs]t[ıi]r/i.test(text) || // TR ("İnternette araştır…")
    // "outside my knowledge base" clause.
    /außerhalb meiner Wissensbasis/i.test(text) || // DE
    /outside my knowledge base/i.test(text) || // EN
    /bilgi taban[ıi]m[ıi]n d[ıi][şs][ıi]nda/i.test(text) // TR
  );
}

/** Heuristic confidence for the existing konfidenz bars (RAG has no native score).
 * Phase-2 backlog: compute from rerank scores + retrieval count. */
export function inferKonfidenz(text: string, weissNicht: boolean): AiKonfidenz {
  if (weissNicht) return "niedrig";
  // Rule-3 "unclear from our sources" hedge, mirrored across DE/EN/TR.
  if (
    /nicht eindeutig hervor/i.test(text) || // DE
    /not clearly stated in our sources/i.test(text) || // EN
    /net olarak belirtilmemiş/i.test(text) // TR
  ) {
    return "niedrig";
  }
  if (isOutOfScope(text)) return "niedrig";
  if (/\[Quellen?:/.test(text)) return "hoch";
  return "mittel";
}

/* Shared types for the dashboard hero search + (placeholder) AI mode.
 * Stage 1: the AI side is UI-only — the real RAG answer comes in stage 2. */

/** One search result, normalised across the four source tables. */
export interface SearchHit {
  id: string;
  /** Display title. */
  title: string;
  /** Dezenter Meta-Text (path, brand, category …). */
  subtitle: string | null;
  /** Navigation target. Internal route ("/…") or a direct asset URL. */
  href: string;
}

/** Results grouped by source table, as returned by /api/search. */
export interface SearchResults {
  pages: SearchHit[];
  documents: SearchHit[];
  assets: SearchHit[];
  brands: SearchHit[];
}

export interface SearchResponse {
  results: SearchResults;
}

/** A source citation in the AI answer (DATA_CONTRACT, BAU-Auftrag §5.4). */
export interface AiSource {
  dokument_titel: string;
  domain: string;
  quelle: string;
  link: string;
  seite: number;
  stand: string;
}

export type AiKonfidenz = "niedrig" | "mittel" | "hoch";

/** AI answer payload — the contract the real stage-2 backend will fulfil. */
export interface AiAnswer {
  text: string;
  quellen: AiSource[];
  konfidenz: AiKonfidenz;
  weiss_nicht: boolean;
}

/** One question→answer exchange in the (localStorage-persisted) chat history. */
export interface AiTurn {
  id: string;
  question: string;
  model: string;
  answer: AiAnswer | null;
  // ── RAG additions (Stage 2, all optional → old persisted turns stay valid) ──
  /** correction/feedback targeting (the rag-query assistant message row id). */
  messageId?: number | null;
  /** true while streaming; its mere presence also marks a RAG (vs legacy) turn. */
  isStreaming?: boolean;
  /** out-of-corpus refusal — for styling/icon differentiation. */
  weissNicht?: boolean;
  feedback?: "helpful" | "not_helpful" | null;
  error?: string | null;
  // ── Web-Search additions (Workstream 1 skeleton; full impl in Workstream 4) ──
  /** user clicked "Im Web suchen" on this turn. */
  webSearchTriggered?: boolean;
  /** this turn IS a web-search result. */
  isWebSearch?: boolean;
}

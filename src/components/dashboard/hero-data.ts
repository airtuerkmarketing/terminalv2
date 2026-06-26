/* Static configuration for the dashboard hero (Stage 1).
 * - Orbit logos: LLM providers, hosted locally under /public/orbit (no CDN
 *   dependency). The airtuerk centre is a text wordmark (no raster logo exists
 *   in public.assets yet — logo_asset_id is NULL on every brand).
 * - Mode-Chips: KI sub-modes (Mail polieren / Übersetzen / Kurzfassen /
 *   Eskalations-Antwort) shown above the box; each arms a focused rag-query mode.
 * - Models: anbieter-neutral selector; today pure UI (no real routing). */

export interface OrbitLogo {
  url: string;
  name: string;
}

/** 7 LLM providers orbiting the airtuerk centre (BAU-Auftrag §4). */
export const ORBIT_LOGOS: OrbitLogo[] = [
  { url: "/orbit/anthropic.svg", name: "Anthropic Claude" },
  { url: "/orbit/openai.svg", name: "OpenAI GPT" },
  { url: "/orbit/gemini.svg", name: "Google Gemini" },
  { url: "/orbit/mistral.svg", name: "Mistral" },
  { url: "/orbit/meta.svg", name: "Meta Llama" },
  // TODO(stage 2): cohere.svg is a tinted lettermark fallback (no official
  // glyph in the simple-icons set) — replace with the real Cohere logo.
  { url: "/orbit/cohere.svg", name: "Cohere" },
  { url: "/orbit/deepseek.svg", name: "DeepSeek" },
];

/** Centre crossfade slots — airtuerk ↔ terminal wordmarks as SVG <img> so the
 * native CloudOrbit images[] crossfade + glass bubble engage (BAU-Auftrag
 * Fix #2). Text can't go through the <img>-only crossfade path; these are
 * placeholders until a raster airtuerk wordmark is uploaded to public.assets. */
export const CENTER_IMAGES: OrbitLogo[] = [
  { url: "/orbit/center-airtuerk.svg", name: "airtuerk" },
  { url: "/orbit/center-terminal.svg", name: "terminal" },
];

/** AI chat sub-modes — the Mode-Chips above the search box (D-072). Each arms a
 * focused system prompt in rag-query (v12+); "default" = normal RAG retrieval.
 * `glow` drives the per-chip colored halo — a SCOPED exception to D-036: the
 * accent stays Quantum-Blue everywhere else; these semantic mode colors live only
 * on the mode-chips and the box's armed glow. */
export type ChatMode =
  | "default"
  | "rewrite-mail"
  | "translate"
  | "summarize"
  | "escalation";

export interface ModeChip {
  id: Exclude<ChatMode, "default">;
  label: string;
  glow: "green" | "blue" | "amber" | "red";
  /** textarea placeholder while this mode is armed. */
  placeholder: string;
}

export const MODE_CHIPS: ModeChip[] = [
  {
    id: "rewrite-mail",
    label: "Polish email",
    glow: "green",
    placeholder: "Paste the text you want polished into a friendly customer email…",
  },
  {
    id: "translate",
    label: "Translate",
    glow: "blue",
    placeholder: "Paste text — I'll translate between DE, EN, and TR…",
  },
  {
    id: "summarize",
    label: "Summarize",
    glow: "amber",
    placeholder: "Paste a long text or email thread — I'll summarize the key points…",
  },
  {
    id: "escalation",
    label: "Escalation reply",
    glow: "red",
    placeholder: "Paste a complaint email — I'll draft a diplomatic reply…",
  },
];

export interface AiModel {
  id: string;
  label: string;
  provider: string;
}

/** Anbieter-neutral model list. Default = Claude (Übergabe-Protokoll). */
export const AI_MODELS: AiModel[] = [
  { id: "claude", label: "Claude", provider: "Anthropic" },
  { id: "gpt-4", label: "GPT-4", provider: "OpenAI" },
  { id: "gemini", label: "Gemini", provider: "Google" },
];

export const DEFAULT_MODEL_ID = "claude";

/** localStorage keys (no Supabase persistence today — no login). */
export const LS_HISTORY = "terminal_chat_history";
export const LS_MODEL = "terminal_ki_model";

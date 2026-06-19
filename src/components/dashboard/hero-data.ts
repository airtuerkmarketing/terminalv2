/* Static configuration for the dashboard hero (Stage 1).
 * - Orbit logos: LLM providers, hosted locally under /public/orbit (no CDN
 *   dependency). The airtuerk centre is a text wordmark (no raster logo exists
 *   in public.assets yet — logo_asset_id is NULL on every brand).
 * - Quick-Chips: 4 curated placeholders; replaced by real top-queries once the
 *   search-logging table lands (Migration 0031, later).
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

/** 4 static, curated quick-chips. Click inserts the text (no auto-submit). */
export const QUICK_CHIPS: string[] = [
  "Was ist ein Zip-Mandat?",
  "Wer ist für Mietwagen zuständig?",
  "SEPA-Formular Hauptkonto",
  "Letzte Updates aus dem Wiki",
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

// Chip personalization preamble (UI chrome, D-072 follow-up).
//
// Rendered ABOVE the answer body by AIAnswerBlock — never concatenated into
// `answer.text`. That separation is load-bearing: the chip outputs (polished
// mail / translation / summary / escalation draft) are meant to be copy-pasted
// straight into Outlook, and `copyAnswer()` copies `answer.text` only. A preamble
// inside the stream would contaminate that payload; as chrome it cannot.
//
// Language is MIRRORED from the user's input (strict-mirroring objective): the
// greeting appears in the same language the question was written in (DE/EN/TR).
import type { ChatMode } from "@/components/dashboard/hero-data";

export type PreambleLang = "de" | "en" | "tr";

// Distinctive stopwords for the no-diacritics DE/EN tie-break. Intentionally small
// — this is a greeting, not a language classifier.
const DE_WORDS =
  /\b(der|die|das|und|ich|ist|ein|eine|einen|einem|einer|nicht|mit|für|auf|dem|den|von|wie|was|wer|bitte|kannst|du|wir|uns|über|kein|mein|haben|wird)\b/gi;
const EN_WORDS =
  /\b(the|and|is|are|a|an|of|to|in|for|you|your|what|who|how|can|could|please|this|that|with|my|we|our|about|need|want)\b/gi;

/**
 * Best-effort DE/EN/TR detection from the user's input. Turkish-exclusive letters
 * (ı ş ğ İ) decide first; then German umlauts/ß; otherwise a stopword count, with
 * German as the tie-break (airtuerk is a German-first company). Good enough for a
 * greeting line — the model itself still mirrors the language in the answer body.
 */
export function detectLang(input: string): PreambleLang {
  const raw = input ?? "";
  const t = raw.toLowerCase();
  if (!t.trim()) return "de";
  // ı (dotless i), ş, ğ and İ are Turkish-exclusive among DE/EN/TR.
  if (/[şğı]/.test(t) || /İ/.test(raw)) return "tr";
  // Umlauts / ß without Turkish letters → German.
  if (/[äöüß]/.test(t)) return "de";
  const de = (t.match(DE_WORDS) ?? []).length;
  const en = (t.match(EN_WORDS) ?? []).length;
  return en > de ? "en" : "de";
}

// Per-mode noun phrase, already carrying its German article/possessive so the DE
// template stays gender-correct ("dein Antwort-Entwurf" vs "deine Übersetzung").
const THING: Record<Exclude<ChatMode, "default">, Record<PreambleLang, string>> = {
  "rewrite-mail": {
    de: "deine überarbeitete E-Mail",
    en: "your polished email",
    tr: "düzenlenmiş e-postan",
  },
  translate: {
    de: "deine Übersetzung",
    en: "your translation",
    tr: "çevirin",
  },
  summarize: {
    de: "deine Zusammenfassung",
    en: "your summary",
    tr: "özetin",
  },
  escalation: {
    de: "dein Antwort-Entwurf",
    en: "your reply draft",
    tr: "yanıt taslağın",
  },
};

// Neutral fallback when no first name is known (mirrors GreetingOrbit's "Kollege").
const FALLBACK_NAME: Record<PreambleLang, string> = {
  de: "Kollege",
  en: "there",
  tr: "merhaba",
};

/**
 * Build the personalization preamble for a chip turn, mirroring the input language.
 * Returns null for non-chip / default-RAG turns so the caller renders nothing.
 */
export function buildPreamble(
  mode: ChatMode | undefined,
  firstName: string | null,
  input: string,
): string | null {
  if (!mode || mode === "default") return null;
  const thingByLang = THING[mode];
  if (!thingByLang) return null;
  const lang = detectLang(input);
  const thing = thingByLang[lang];
  const name = firstName?.trim() || FALLBACK_NAME[lang];
  switch (lang) {
    case "en":
      return `Hey ${name}, here is ${thing} you requested.`;
    case "tr":
      return `Merhaba ${name}, işte ${thing}:`;
    case "de":
    default:
      return `Hallo ${name}, hier ist ${thing}:`;
  }
}

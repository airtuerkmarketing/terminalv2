"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TerminalLogo } from "@/components/shell/TerminalLogo";
import { TooltipShell } from "@/components/ui/tooltip";
import { useTypewriterText } from "@/components/dashboard/hero/useTypewriterText";
import { AnswerFeedback } from "@/components/dashboard/hero/AnswerFeedback";
import type { AiKonfidenz, AiTurn } from "@/lib/search/types";
import { isOutOfScope } from "@/lib/rag/client";
import { buildPreamble, detectLang } from "@/lib/rag/preamble";

/* One question→answer turn inside the chat window (BAU-Auftrag §5.4).
 * Stage 1: the answer is a placeholder rendered after a fake delay; the shape
 * follows the DATA_CONTRACT so the stage-2 RAG backend drops in unchanged.
 * `typewriter` (the newest turn) reveals the text progressively; sources +
 * confidence appear once typing is done. */

const KONFIDENZ_LEVEL: Record<AiKonfidenz, number> = {
  niedrig: 1,
  mittel: 2,
  hoch: 3,
};
const KONFIDENZ_LABEL: Record<AiKonfidenz, string> = {
  niedrig: "Low confidence",
  mittel: "Medium confidence",
  hoch: "High confidence",
};

/* Strip inline "[Quelle: …]" / "[Quellen: …]" / "[Kontext: …]" markers the model
 * sometimes injects mid-prose — they clutter the answer and duplicate the sources
 * toggle. Removes complete bracketed markers and any trailing unterminated one
 * still arriving mid-stream, then collapses the doubled space left behind. */
function stripInlineCitations(text: string): string {
  return text
    .replace(/\s*\[(?:Quellen?|Kontext)\b[^\]]*\]/gi, "")
    .replace(/\s*\[(?:Quellen?|Kontext)\b[^\]]*$/i, "")
    .replace(/[ \t]{2,}/g, " ");
}

/* pause_turn notice — web-search server-tool hit its iteration cap (Anthropic
   pause_turn). Language-mirrored like the preamble. Notice-only: no retry affordance
   exists in the other error states (verified — no retry pattern in dashboard), so we
   match that pattern. Copy says "iteration limit" (not "took longer") — that is what
   actually happened, so an observant user understands. */
const PAUSED_NOTICE: Record<"de" | "en" | "tr", string> = {
  de: "Die Suche hat ihr Iterations-Limit erreicht. Bitte stelle eine spezifischere Frage oder formuliere sie um.",
  en: "The search hit its iteration limit. Try a more specific question or rephrase.",
  tr: "Arama, yineleme sınırına ulaştı. Lütfen daha spesifik bir soru sorun veya yeniden ifade edin.",
};

/* Web-search loading copy (1.5b). A web-search turn runs a 30-90s server-side
   operation (3 search iterations + Sonnet synthesis), so the generic "AI is thinking…"
   reads as "stuck". Tier 1 shows immediately; Tier 2 escalates after 8s (no first token
   yet) to set the 30-60s expectation. Both language-mirror the question via detectLang.
   Once the first token streams the loading branch unmounts entirely. */
const WEB_SEARCH_LOADING_TIER1: Record<"de" | "en" | "tr", string> = {
  de: "Im Web wird gesucht…",
  en: "Searching the web…",
  tr: "Web'de aranıyor…",
};
const WEB_SEARCH_LOADING_TIER2: Record<"de" | "en" | "tr", string> = {
  de: "Suche im Web läuft — kann 30-60 Sekunden dauern.",
  en: "Searching the web — this can take 30-60 seconds.",
  tr: "Web'de aranıyor — 30-60 saniye sürebilir.",
};

export function AIAnswerBlock({
  turn,
  typewriter = false,
  firstName = null,
  onCorrect,
  onFeedbackChange,
  onWebSearch,
}: {
  turn: AiTurn;
  typewriter?: boolean;
  /** Signed-in user's first name — drives the chip personalization preamble. */
  firstName?: string | null;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
  /** Accept the rule-7 web-search offer for this out-of-scope turn. */
  onWebSearch?: (turn: AiTurn) => void;
}) {
  // Spinner until the first token; once text streams it renders live.
  const showLoading =
    turn.answer === null || (turn.isStreaming === true && !turn.answer.text);

  return (
    <div className="ai-chat-turn">
      <div className="ai-chat-q">{turn.question}</div>

      <div className="ai-chat-a">
        {turn.error ? (
          <p className="ai-chat-a-text">⚠️ {turn.error}</p>
        ) : showLoading ? (
          <ChatLoading turn={turn} />
        ) : (
          <AITurnAnswer
            turn={turn}
            typewriter={typewriter}
            firstName={firstName}
            onCorrect={onCorrect}
            onFeedbackChange={onFeedbackChange}
            onWebSearch={onWebSearch}
          />
        )}
      </div>
    </div>
  );
}

/* Loading branch — split out so the 8s tier-2 timer can live in a hook without
 * violating Rules of Hooks (the inline JSX it replaced had no hooks). Normal turns
 * keep the unchanged English "AI is thinking…"; web-search turns get the
 * language-mirrored two-tier copy (Tier 1 immediate, Tier 2 after 8s with no token).
 * The whole component unmounts the moment the first token flips showLoading to false,
 * which also clears the timer — so the timer firing == "8s elapsed, still no token". */
function ChatLoading({ turn }: { turn: AiTurn }) {
  const [extended, setExtended] = useState(false);
  useEffect(() => {
    if (!turn.isWebSearch) return; // no escalation timer for normal RAG turns
    const t = setTimeout(() => setExtended(true), 8000);
    return () => clearTimeout(t);
  }, [turn.isWebSearch]);

  const lang = detectLang(turn.question);

  return (
    <>
      <div className="ai-chat-loading">
        {/* Spinning terminal mark as the load indicator (filled, currentColor). */}
        <TerminalLogo variant="mark" title="" className="ai-chat-loader-mark" />
        <span>{turn.isWebSearch ? WEB_SEARCH_LOADING_TIER1[lang] : "AI is thinking…"}</span>
      </div>
      {/* Tier 2 — muted expectation-setter, reuses the paused-notice banner styling. */}
      {turn.isWebSearch && extended && (
        <p className="ai-chat-paused-notice" role="status">
          ⏳ {WEB_SEARCH_LOADING_TIER2[lang]}
        </p>
      )}
    </>
  );
}

/* Answered branch — split out so useTypewriterText is always called when this
 * renders (the loading branch returns before it, keeping Rules of Hooks). */
function AITurnAnswer({
  turn,
  typewriter,
  firstName,
  onCorrect,
  onFeedbackChange,
  onWebSearch,
}: {
  turn: AiTurn;
  typewriter: boolean;
  firstName?: string | null;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
  onWebSearch?: (turn: AiTurn) => void;
}) {
  const answer = turn.answer!;
  const streaming = turn.isStreaming === true;
  // Chip personalization preamble (UI chrome, language-mirrored from the question).
  // null for default-RAG turns. Hidden on an out-of-scope refusal — a "here is your
  // translation" line above a "this is outside my knowledge base" answer is wrong.
  const preamble = isOutOfScope(answer.text)
    ? null
    : buildPreamble(turn.chatMode, firstName ?? null, turn.question);
  // A RAG turn (streamed this session, or persisted from one) already animated
  // live via the stream — don't re-typewriter it. Legacy/non-RAG turns keep it.
  const isRagTurn = turn.isStreaming !== undefined;
  const useTw = typewriter && !isRagTurn;
  const { shown, done } = useTypewriterText(useTw ? answer.text : "");
  const text = useTw ? shown : answer.text;
  const finished = streaming ? false : useTw ? done : true;
  // Hide inline "[Quelle: …]" / "[Kontext: …]" citations from the rendered prose
  // (sources live in the toggle by the feedback buttons). DISPLAY-only strip —
  // the raw text already drove confidence inference upstream.
  const displayText = stripInlineCitations(text);
  // pause_turn notice (web-search iteration cap), language-mirrored from the question.
  const pausedNotice = turn.paused ? PAUSED_NOTICE[detectLang(turn.question)] : null;

  // Copy the raw answer to the clipboard with a brief check-mark confirmation.
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  function copyAnswer() {
    navigator.clipboard?.writeText(answer.text).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <>
      {/* Brand-mark avatar — anchors each AI answer so it's unmistakably the answer
          (vs the right-aligned question bubble). title="" → aria-hidden. D-108 v3. */}
      <TerminalLogo variant="mark" title="" className="ai-chat-ai-mark" />
      {/* Personalization preamble — chrome ABOVE the answer, kept out of answer.text
          so the chip output stays clean for copy-paste. Language mirrors the input. */}
      {preamble && <p className="ai-chat-preamble">{preamble}</p>}

      {/* Markdown is rendered live as tokens stream in (Claude-style) so the
          answer carries structure immediately — no raw-text-then-snap reflow.
          A blinking caret trails the text while streaming or typewriting. */}
      <div className="ai-chat-answer">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
        {(streaming || (useTw && !finished)) && (
          <span className="ai-chat-caret" aria-hidden="true" />
        )}
      </div>

      {/* pause_turn notice — explicit state when web-search hit its iteration cap
          (instead of a silent/abrupt empty answer). Notice-only, language-mirrored. */}
      {pausedNotice && (
        <p className="ai-chat-paused-notice" role="status">
          ⏳ {pausedNotice}
        </p>
      )}

      {/* Web-Search fallback — offered on a rule-7 out-of-scope refusal. Clicking it
          fires a fresh web-search turn for the same question (handled in SearchAIBox). */}
      {finished &&
        !turn.isWebSearch &&
        !turn.webSearchTriggered &&
        onWebSearch &&
        isOutOfScope(answer.text) && (
          <div className="ai-chat-websearch-container">
            <button
              type="button"
              className="ai-chat-websearch-btn"
              onClick={() => onWebSearch(turn)}
              aria-label="Search the web for this question"
            >
              <span className="ai-chat-websearch-icon">🌐</span>
              <span>Yes, search the web</span>
            </button>
          </div>
        )}

      {/* Meta row — ONE line: actions left (icon-only ghost buttons), the trust
          group right (sources toggle · separator · confidence). The confidence
          block is no longer a separate stacked row. */}
      {finished && (
        <div className="ai-chat-actions">
          <div className="ai-chat-actions-left">
            <TooltipShell content={copied ? "Copied" : "Copy"} dark>
              <button
                type="button"
                className="ai-chat-copy"
                onClick={copyAnswer}
                aria-label={copied ? "Copied" : "Copy answer"}
              >
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              </button>
            </TooltipShell>
            {turn.messageId && onCorrect && onFeedbackChange && (
              <AnswerFeedback
                messageId={turn.messageId}
                currentFeedback={turn.feedback ?? null}
                onCorrect={() => onCorrect(turn)}
                onFeedbackChange={(fb) => onFeedbackChange(turn.id, fb)}
                disabled={turn.isStreaming}
              />
            )}
          </div>

          <div className="ai-chat-actions-right">
            {answer.quellen.length > 0 && (
              <>
                <details className="ai-chat-sources-toggle">
                  <summary aria-label={`Show ${answer.quellen.length} sources`}>
                    <TooltipShell content="Sources" dark>
                      <span className="ai-chat-sources-summary-inner">
                        <BookOpen size={13} aria-hidden="true" />
                        <span className="ai-chat-sources-count">{answer.quellen.length}</span>
                      </span>
                    </TooltipShell>
                  </summary>
                  <div className="ai-chat-sources-popover">
                    {answer.quellen.map((s, i) => (
                      <a
                        key={`${s.dokument_titel}-${i}`}
                        className="ai-chat-source-chip"
                        href={s.link}
                        target={s.link.startsWith("http") ? "_blank" : undefined}
                        rel={s.link.startsWith("http") ? "noreferrer" : undefined}
                        title={s.dokument_titel}
                      >
                        {s.dokument_titel}
                      </a>
                    ))}
                  </div>
                </details>
                <span className="ai-chat-meta-sep" aria-hidden="true" />
              </>
            )}
            <div className="ai-chat-confidence" data-level={KONFIDENZ_LEVEL[answer.konfidenz]}>
              <span className="ai-chat-conf-bars" aria-hidden="true">
                <span className="ai-chat-conf-bar" />
                <span className="ai-chat-conf-bar" />
                <span className="ai-chat-conf-bar" />
              </span>
              <span className="ai-chat-conf-label">{KONFIDENZ_LABEL[answer.konfidenz]}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

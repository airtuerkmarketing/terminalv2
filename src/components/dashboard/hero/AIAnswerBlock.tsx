"use client";

import { Loader2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTypewriterText } from "@/components/dashboard/hero/useTypewriterText";
import { AnswerFeedback } from "@/components/dashboard/hero/AnswerFeedback";
import type { AiKonfidenz, AiTurn } from "@/lib/search/types";
import { isOutOfScope } from "@/lib/rag/client";

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
  niedrig: "Niedrige Konfidenz",
  mittel: "Mittlere Konfidenz",
  hoch: "Hohe Konfidenz",
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

export function AIAnswerBlock({
  turn,
  typewriter = false,
  onCorrect,
  onFeedbackChange,
}: {
  turn: AiTurn;
  typewriter?: boolean;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
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
          <div className="ai-chat-loading">
            <Loader2 className="ai-chat-spin" aria-hidden="true" />
            <span>KI denkt nach…</span>
          </div>
        ) : (
          <AITurnAnswer
            turn={turn}
            typewriter={typewriter}
            onCorrect={onCorrect}
            onFeedbackChange={onFeedbackChange}
          />
        )}
      </div>
    </div>
  );
}

/* Answered branch — split out so useTypewriterText is always called when this
 * renders (the loading branch returns before it, keeping Rules of Hooks). */
function AITurnAnswer({
  turn,
  typewriter,
  onCorrect,
  onFeedbackChange,
}: {
  turn: AiTurn;
  typewriter: boolean;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
}) {
  const answer = turn.answer!;
  const streaming = turn.isStreaming === true;
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

  return (
    <>
      {/* Markdown is rendered live as tokens stream in (Claude-style) so the
          answer carries structure immediately — no raw-text-then-snap reflow.
          A blinking caret trails the text while streaming or typewriting. */}
      <div className="ai-chat-answer">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
        {(streaming || (useTw && !finished)) && (
          <span className="ai-chat-caret" aria-hidden="true" />
        )}
      </div>

      {/* Web-Search Button (Workstream 1 skeleton — full impl in WS4) */}
      {finished && !turn.isWebSearch && !turn.webSearchTriggered && isOutOfScope(answer.text) && (
        <div className="ai-chat-websearch-container">
          <button
            type="button"
            className="ai-chat-websearch-btn"
            disabled
            title="Web-Suche kommt in Workstream 4"
            aria-label="Web-Suche aktivieren (kommt bald)"
          >
            <span className="ai-chat-websearch-icon">🌐</span>
            <span>Ja, im Web suchen</span>
            <span className="ai-chat-websearch-coming-soon">(bald verfügbar)</span>
          </button>
        </div>
      )}

      {finished && (
        <div
          className="ai-chat-confidence"
          data-level={KONFIDENZ_LEVEL[answer.konfidenz]}
        >
          <span className="ai-chat-conf-bars" aria-hidden="true">
            <span className="ai-chat-conf-bar" />
            <span className="ai-chat-conf-bar" />
            <span className="ai-chat-conf-bar" />
          </span>
          <span className="ai-chat-conf-label">
            {KONFIDENZ_LABEL[answer.konfidenz]}
          </span>
        </div>
      )}

      {/* Action row — feedback buttons with the sources toggle beside them. (The
          sources badge used to float top-right of the answer and overlapped the
          question bubble.) */}
      {finished &&
        (answer.quellen.length > 0 ||
          (turn.messageId && onCorrect && onFeedbackChange)) && (
        <div className="ai-chat-actions">
          {turn.messageId && onCorrect && onFeedbackChange && (
            <AnswerFeedback
              messageId={turn.messageId}
              currentFeedback={turn.feedback ?? null}
              onCorrect={() => onCorrect(turn)}
              onFeedbackChange={(fb) => onFeedbackChange(turn.id, fb)}
              disabled={turn.isStreaming}
            />
          )}
          {answer.quellen.length > 0 && (
            <details className="ai-chat-sources-toggle">
              <summary aria-label={`${answer.quellen.length} Quellen anzeigen`}>
                <BookOpen size={13} aria-hidden="true" />
                <span className="ai-chat-sources-count">{answer.quellen.length}</span>
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
          )}
        </div>
      )}
    </>
  );
}

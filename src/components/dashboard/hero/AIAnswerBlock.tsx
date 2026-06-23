"use client";

import { Loader2, ExternalLink } from "lucide-react";
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

  return (
    <>
      <p className="ai-chat-a-text">
        {text}
        {(streaming || (useTw && !finished)) && (
          <span className="ai-chat-caret" aria-hidden="true" />
        )}
      </p>

      {finished && answer.quellen.length > 0 && (
        <div className="ai-chat-sources">
          {answer.quellen.map((s, i) => (
            <a
              key={`${s.dokument_titel}-${i}`}
              className="ai-chat-source"
              href={s.link}
              target={s.link.startsWith("http") ? "_blank" : undefined}
              rel={s.link.startsWith("http") ? "noreferrer" : undefined}
            >
              <span className="ai-chat-source-head">
                <span className="ai-chat-source-title">{s.dokument_titel}</span>
                <ExternalLink className="ai-chat-source-ext" aria-hidden="true" />
              </span>
              <span className="ai-chat-source-meta">
                <span className="ai-chat-badge">{s.domain}</span>
                <span className="ai-chat-source-stand">Stand {s.stand}</span>
              </span>
            </a>
          ))}
        </div>
      )}

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

      {finished && turn.messageId && onCorrect && onFeedbackChange && (
        <AnswerFeedback
          messageId={turn.messageId}
          currentFeedback={turn.feedback ?? null}
          onCorrect={() => onCorrect(turn)}
          onFeedbackChange={(fb) => onFeedbackChange(turn.id, fb)}
          disabled={turn.isStreaming}
        />
      )}
    </>
  );
}

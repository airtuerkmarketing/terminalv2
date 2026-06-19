"use client";

import { Loader2, ExternalLink } from "lucide-react";
import { useTypewriterText } from "@/components/dashboard/hero/useTypewriterText";
import type { AiAnswer, AiKonfidenz, AiTurn } from "@/lib/search/types";

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
}: {
  turn: AiTurn;
  typewriter?: boolean;
}) {
  const { question, answer } = turn;

  return (
    <div className="ai-chat-turn">
      <div className="ai-chat-q">{question}</div>

      <div className="ai-chat-a">
        {answer === null ? (
          <div className="ai-chat-loading">
            <Loader2 className="ai-chat-spin" aria-hidden="true" />
            <span>KI denkt nach…</span>
          </div>
        ) : (
          <AITurnAnswer answer={answer} typewriter={typewriter} />
        )}
      </div>
    </div>
  );
}

/* Answered branch — split out so useTypewriterText is always called when this
 * renders (the loading branch returns before it, keeping Rules of Hooks). */
function AITurnAnswer({
  answer,
  typewriter,
}: {
  answer: AiAnswer;
  typewriter: boolean;
}) {
  const { shown, done } = useTypewriterText(typewriter ? answer.text : "");
  const text = typewriter ? shown : answer.text;
  const finished = typewriter ? done : true;

  return (
    <>
      <p className="ai-chat-a-text">
        {text}
        {typewriter && !finished && (
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
    </>
  );
}

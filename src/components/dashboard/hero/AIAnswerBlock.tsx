"use client";

import { Loader2, ExternalLink } from "lucide-react";
import type { AiKonfidenz, AiTurn } from "@/lib/search/types";

/* One question→answer turn under the box (BAU-Auftrag §5.4).
 * Stage 1: the answer is a placeholder rendered after a fake delay; the shape
 * follows the DATA_CONTRACT so the stage-2 RAG backend drops in unchanged. */

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

export function AIAnswerBlock({ turn }: { turn: AiTurn }) {
  const { question, answer } = turn;

  return (
    <div className="dh-turn">
      <div className="dh-q">{question}</div>

      <div className="dh-a">
        {answer === null ? (
          <div className="dh-a-loading">
            <Loader2 className="dh-spin" aria-hidden="true" />
            <span>KI denkt nach…</span>
          </div>
        ) : (
          <>
            <p className="dh-a-text">{answer.text}</p>

            {answer.quellen.length > 0 && (
              <div className="dh-sources">
                {answer.quellen.map((s, i) => (
                  <a
                    key={`${s.dokument_titel}-${i}`}
                    className="dh-source"
                    href={s.link}
                    target={s.link.startsWith("http") ? "_blank" : undefined}
                    rel={s.link.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <span className="dh-source-head">
                      <span className="dh-source-title">{s.dokument_titel}</span>
                      <ExternalLink className="dh-source-ext" aria-hidden="true" />
                    </span>
                    <span className="dh-source-meta">
                      <span className="dh-badge">{s.domain}</span>
                      <span className="dh-source-stand">Stand {s.stand}</span>
                    </span>
                  </a>
                ))}
              </div>
            )}

            <div
              className="dh-confidence"
              data-level={KONFIDENZ_LEVEL[answer.konfidenz]}
            >
              <span className="dh-conf-bars" aria-hidden="true">
                <span className="dh-conf-bar" />
                <span className="dh-conf-bar" />
                <span className="dh-conf-bar" />
              </span>
              <span className="dh-conf-label">
                {KONFIDENZ_LABEL[answer.konfidenz]}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

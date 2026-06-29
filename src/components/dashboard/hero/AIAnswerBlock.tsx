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
            {/* Spinning terminal mark as the load indicator (filled, currentColor). */}
            <TerminalLogo variant="mark" title="" className="ai-chat-loader-mark" />
            <span>AI is thinking…</span>
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
            title="Web search arrives in Workstream 4"
            aria-label="Enable web search (coming soon)"
          >
            <span className="ai-chat-websearch-icon">🌐</span>
            <span>Yes, search the web</span>
            <span className="ai-chat-websearch-coming-soon">(coming soon)</span>
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

"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Edit3 } from "lucide-react";
import { submitMessageFeedback } from "@/lib/rag/client";
import { TooltipShell } from "@/components/ui/tooltip";

interface AnswerFeedbackProps {
  messageId: number;
  currentFeedback?: "helpful" | "not_helpful" | null;
  onCorrect: () => void;
  onFeedbackChange: (feedback: "helpful" | "not_helpful") => void;
  disabled?: boolean;
}

export function AnswerFeedback({
  messageId,
  currentFeedback,
  onCorrect,
  onFeedbackChange,
  disabled,
}: AnswerFeedbackProps) {
  const [submitting, setSubmitting] = useState<"helpful" | "not_helpful" | null>(null);

  const handleFeedback = async (feedback: "helpful" | "not_helpful") => {
    if (submitting || currentFeedback || disabled) return;
    setSubmitting(feedback);
    try {
      await submitMessageFeedback(messageId, feedback);
      onFeedbackChange(feedback);
    } catch (err) {
      console.error("Feedback submit failed:", err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="ai-chat-feedback" role="group" aria-label="Rate answer">
      {/* Icon-only ghost buttons; labels live in dark TooltipShells (no native
          title= so the browser tooltip doesn't double up). aria-label stays. */}
      <TooltipShell content="Helpful" dark>
        <button
          type="button"
          className={`ai-chat-feedback-btn ${currentFeedback === "helpful" ? "ai-chat-feedback-btn--active" : ""}`}
          onClick={() => handleFeedback("helpful")}
          disabled={!!currentFeedback || !!submitting || disabled}
          aria-label="Helpful"
        >
          <ThumbsUp size={14} aria-hidden="true" />
        </button>
      </TooltipShell>
      <TooltipShell content="Not helpful" dark>
        <button
          type="button"
          className={`ai-chat-feedback-btn ${currentFeedback === "not_helpful" ? "ai-chat-feedback-btn--active" : ""}`}
          onClick={() => handleFeedback("not_helpful")}
          disabled={!!currentFeedback || !!submitting || disabled}
          aria-label="Not helpful"
        >
          <ThumbsDown size={14} aria-hidden="true" />
        </button>
      </TooltipShell>
      <TooltipShell content="Correct" dark>
        <button
          type="button"
          className="ai-chat-feedback-btn ai-chat-feedback-btn--correct"
          onClick={onCorrect}
          disabled={disabled}
          aria-label="Correct answer"
        >
          <Edit3 size={14} aria-hidden="true" />
        </button>
      </TooltipShell>
    </div>
  );
}

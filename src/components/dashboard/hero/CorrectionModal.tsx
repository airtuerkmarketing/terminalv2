"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { submitCorrection } from "@/lib/rag/client";
import { useToast } from "@/components/ui/toast";

interface CorrectionModalProps {
  isOpen: boolean;
  sessionId: string;
  messageId: number;
  originalQuestion: string;
  originalAnswer: string;
  onClose: () => void;
  onSubmitted: () => void;
}

type CorrectionType = "factual_error" | "missing_info" | "outdated" | "context_wrong";

const CORRECTION_TYPES: Array<{ value: CorrectionType; label: string; description: string }> = [
  {
    value: "factual_error",
    label: "Factual error",
    description: "The answer contains incorrect information",
  },
  {
    value: "missing_info",
    label: "Missing information",
    description: "Important details are missing from the answer",
  },
  {
    value: "outdated",
    label: "Outdated",
    description: "The information is no longer current",
  },
  {
    value: "context_wrong",
    label: "Wrong context",
    description: "The AI misunderstood the question",
  },
];

export function CorrectionModal({
  isOpen,
  sessionId,
  messageId,
  originalQuestion,
  originalAnswer,
  onClose,
  onSubmitted,
}: CorrectionModalProps) {
  const [correctionType, setCorrectionType] = useState<CorrectionType>("factual_error");
  const [proposedCorrection, setProposedCorrection] = useState("");
  const [userReference, setUserReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCorrectionType("factual_error");
      setProposedCorrection("");
      setUserReference("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!proposedCorrection.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitCorrection({
        sessionId,
        messageId,
        originalQuestion,
        originalAnswer,
        proposedCorrection: proposedCorrection.trim(),
        correctionType,
        userReference: userReference.trim() || undefined,
      });
      toast({
        title: "Correction submitted",
        description:
          "Murat or Selin will review your suggestion — you'll get an email once a decision has been made.",
        variant: "success",
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="ai-correction-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-modal-title"
    >
      <div className="ai-correction-modal">
        <header className="ai-correction-header">
          <h2 id="correction-modal-title">Correct answer</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="ai-correction-close"
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="ai-correction-body">
          <section className="ai-correction-context">
            <div className="ai-correction-label">Question</div>
            <div className="ai-correction-original-q">{originalQuestion}</div>
            <div className="ai-correction-label">AI answer</div>
            <div className="ai-correction-original-a">{originalAnswer}</div>
          </section>

          <section className="ai-correction-form">
            <div className="ai-correction-field">
              <span className="ai-correction-field-label">Type of correction</span>
              <div className="ai-correction-types">
                {CORRECTION_TYPES.map((type) => (
                  <label key={type.value} className={`ai-correction-type ${correctionType === type.value ? "ai-correction-type--selected" : ""}`}>
                    <input
                      type="radio"
                      name="correctionType"
                      value={type.value}
                      checked={correctionType === type.value}
                      onChange={() => setCorrectionType(type.value)}
                      disabled={submitting}
                    />
                    <div>
                      <div className="ai-correction-type-label">{type.label}</div>
                      <div className="ai-correction-type-desc">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <label className="ai-correction-field">
              <span className="ai-correction-field-label">
                Correct answer <span className="ai-correction-required">*</span>
              </span>
              <textarea
                value={proposedCorrection}
                onChange={(e) => setProposedCorrection(e.target.value)}
                placeholder="What should the answer be? Please be precise and include all relevant details."
                rows={5}
                disabled={submitting}
                className="ai-correction-textarea"
                required
              />
            </label>

            <label className="ai-correction-field">
              <span className="ai-correction-field-label">
                Source / Reference <span className="ai-correction-optional">(optional)</span>
              </span>
              <input
                type="text"
                value={userReference}
                onChange={(e) => setUserReference(e.target.value)}
                placeholder="e.g. Confluence link, document, person who can confirm it"
                disabled={submitting}
                className="ai-correction-input"
              />
            </label>

            {error && (
              <div className="ai-correction-error" role="alert">
                ⚠️ {error}
              </div>
            )}
          </section>
        </div>

        <footer className="ai-correction-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="ai-correction-btn ai-correction-btn--secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!proposedCorrection.trim() || submitting}
            className="ai-correction-btn ai-correction-btn--primary"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="ai-correction-spin" aria-hidden="true" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Submit correction
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

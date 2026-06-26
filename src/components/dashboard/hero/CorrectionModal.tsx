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
    label: "Fakten-Fehler",
    description: "Die Antwort enthält falsche Informationen",
  },
  {
    value: "missing_info",
    label: "Fehlende Information",
    description: "Wichtige Details fehlen in der Antwort",
  },
  {
    value: "outdated",
    label: "Veraltet",
    description: "Die Information ist nicht mehr aktuell",
  },
  {
    value: "context_wrong",
    label: "Falscher Kontext",
    description: "Die KI hat die Frage missverstanden",
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
        title: "Korrektur eingereicht",
        description:
          "Murat oder Selin reviewt deinen Vorschlag — du bekommst eine Email, sobald entschieden wurde.",
        variant: "success",
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
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
          <h2 id="correction-modal-title">Antwort korrigieren</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="ai-correction-close"
            aria-label="Schließen"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="ai-correction-body">
          <section className="ai-correction-context">
            <div className="ai-correction-label">Frage</div>
            <div className="ai-correction-original-q">{originalQuestion}</div>
            <div className="ai-correction-label">KI-Antwort</div>
            <div className="ai-correction-original-a">{originalAnswer}</div>
          </section>

          <section className="ai-correction-form">
            <div className="ai-correction-field">
              <span className="ai-correction-field-label">Art der Korrektur</span>
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
                Richtige Antwort <span className="ai-correction-required">*</span>
              </span>
              <textarea
                value={proposedCorrection}
                onChange={(e) => setProposedCorrection(e.target.value)}
                placeholder="Wie sollte die Antwort lauten? Bitte präzise und mit allen relevanten Details."
                rows={5}
                disabled={submitting}
                className="ai-correction-textarea"
                required
              />
            </label>

            <label className="ai-correction-field">
              <span className="ai-correction-field-label">
                Quelle / Referenz <span className="ai-correction-optional">(optional)</span>
              </span>
              <input
                type="text"
                value={userReference}
                onChange={(e) => setUserReference(e.target.value)}
                placeholder="z.B. Confluence-Link, Dokument, Person die das bestätigen kann"
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
            Abbrechen
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
                Wird gesendet...
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Korrektur einreichen
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

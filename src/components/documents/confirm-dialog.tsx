"use client";

import type { ReactNode } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Modal } from "./modal";

/**
 * Centred confirmation dialog built on the shared Modal shell: a round halo icon,
 * title, explanatory text, and Cancel / Confirm buttons. Two tones — `accent`
 * (neutral actions like visibility) and `danger` (destructive, e.g. delete). Used
 * everywhere a window.confirm used to be.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  tone = "accent",
  busy = false,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "accent" | "danger";
  busy?: boolean;
  icon?: ReactNode;
}) {
  const fallbackIcon = tone === "danger" ? <AlertTriangle size={24} aria-hidden="true" /> : <HelpCircle size={24} aria-hidden="true" />;
  return (
    <Modal open={open} onClose={onClose} title={title} width={420} hideHeader>
      <div className={`dl-confirm-dialog tone-${tone}`}>
        <div className="dl-confirm-halo">{icon ?? fallbackIcon}</div>
        <h3 className="dl-confirm-title">{title}</h3>
        <p className="dl-confirm-msg">{message}</p>
        <div className="dl-confirm-actions">
          <button type="button" className="dl-btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`dl-btn ${tone === "danger" ? "cdanger" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

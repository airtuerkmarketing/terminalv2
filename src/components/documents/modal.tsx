"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Modal shell (portaled to <body>). Renders only when open, so `document` always
 * exists at portal time. Escape + backdrop click close it. The visual chrome
 * (blurred scrim, soft-shadow panel, scale/fade-in) lives in .dl-modal* CSS.
 * `hideHeader` skips the title bar for dialogs that draw their own centred layout
 * (e.g. ConfirmDialog) — `title` is still used as the aria-label.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width,
  hideHeader = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: number;
  hideHeader?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dl-modal-backdrop" onClick={onClose}>
      <div
        className="dl-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideHeader && (
          <header className="dl-modal-head">
            <div className="dl-modal-head-text">
              <h3>{title}</h3>
              {subtitle && <p className="dl-modal-sub">{subtitle}</p>}
            </div>
            <button type="button" className="dl-modal-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
        )}
        <div className="dl-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

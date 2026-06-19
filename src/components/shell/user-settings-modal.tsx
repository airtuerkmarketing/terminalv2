"use client";

import "@/styles/user-settings-modal.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "./theme-toggle";

/**
 * User settings modal. Rendered via a portal to <body> so it is never clipped
 * by the sidebar's `overflow:hidden` or its transformed stacking context (the
 * mobile drawer uses translateX). Closes on Escape, backdrop click, or the X.
 *
 * Content is a scaffold for now — the account block and an appearance row
 * (theme) are real; further settings rows land in a follow-up.
 */
export function UserSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock scroll while open
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="usm-overlay" role="presentation" onClick={onClose}>
      <div
        className="usm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="usm-header">
          <h2 id="usm-title" className="usm-title">
            Einstellungen
          </h2>
          <button
            type="button"
            className="usm-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="usm-body">
          <section className="usm-section">
            <div className="usm-account">
              <div className="usm-avatar">BD</div>
              <div className="usm-account-meta">
                <div className="usm-account-name">Buhara Demir</div>
                <div className="usm-account-role">Admin</div>
              </div>
            </div>
          </section>

          <section className="usm-section">
            <div className="usm-section-label">Darstellung</div>
            <div className="usm-row">
              <span>Design</span>
              <ThemeToggle />
            </div>
          </section>

          <p className="usm-note">Weitere Einstellungen folgen.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

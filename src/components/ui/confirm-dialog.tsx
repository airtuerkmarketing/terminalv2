"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./confirm-dialog.css";

/**
 * Confirmation modal — the generalized, reusable form of the inline two-step
 * `dl-confirm` pattern used across the libraries. Portaled to <body> and
 * focus-trapped (adapted from the user-detail-modal), so it works above other
 * modals. Renders only when `open`.
 *
 * Escape / backdrop click / the cancel button call `onClose`; the confirm button
 * calls `onConfirm`. `variant="danger"` tints the confirm action with --torch for
 * destructive operations. Pass `items` to list the affected entries (e.g. the
 * email addresses a bulk-invite is about to hit). NEVER use window.confirm.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  variant = "default",
  confirmDisabled = false,
  items,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  confirmDisabled?: boolean;
  items?: string[];
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="ui-confirm-backdrop" onClick={onClose}>
      <div
        className="ui-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="ui-confirm-title">{title}</h2>
        {description && <div className="ui-confirm-desc">{description}</div>}
        {items && items.length > 0 && (
          <ul className="ui-confirm-list">
            {items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        )}
        <div className="ui-confirm-actions">
          <button type="button" className="ui-confirm-btn ui-confirm-btn--cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`ui-confirm-btn ui-confirm-btn--confirm${variant === "danger" ? " is-danger" : ""}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

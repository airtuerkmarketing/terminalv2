"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { setFolderVisibility } from "@/app/(public)/documents-library/actions";
import { Modal } from "./modal";

/**
 * Status pill for a folder's visibility that is SAFE to operate: the pill itself
 * never toggles on a plain click. Hover or right-click opens a small popover with
 * a single action ("Make public" / "Make private"); choosing it opens a confirm
 * modal (shared modal.tsx), and only confirming calls setFolderVisibility. Popover
 * closes on outside-click / Esc / mouse-leave. Super-admin only — non-admins get a
 * static pill rendered by the caller. Visually calm (neutral, not loud red).
 */
export function VisibilityPopover({ folderId, isPublic }: { folderId: string; isPublic: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeT.current) {
      clearTimeout(closeT.current);
      closeT.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  // Small grace delay bridges the gap between the pill and the popover so moving
  // the pointer between them doesn't dismiss it.
  const scheduleClose = () => {
    cancelClose();
    closeT.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  const nextLabel = isPublic ? "Make private" : "Make public";

  async function doToggle() {
    setBusy(true);
    await setFolderVisibility(folderId, !isPublic);
    setBusy(false);
    setConfirm(false);
    router.refresh();
  }

  return (
    <div className="dl-vis" ref={rootRef} onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={`dl-status-pill${isPublic ? "" : " is-private"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onContextMenu={(e) => {
          e.preventDefault();
          openNow();
        }}
        title="Visibility"
      >
        {isPublic ? <Globe size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
        {isPublic ? "Public" : "Private"}
      </button>

      {open && (
        <div className="dl-vis-pop" role="menu" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
          <button
            type="button"
            role="menuitem"
            className="dl-vis-item"
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
          >
            {isPublic ? <Lock size={14} aria-hidden="true" /> : <Globe size={14} aria-hidden="true" />}
            {nextLabel}
          </button>
        </div>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title={nextLabel} width={440}>
        <div className="dl-form">
          <p className="dl-confirm-text">
            {isPublic
              ? "Are you sure? This folder will become private and hidden from everyone except admins."
              : "Are you sure? This folder will be visible to everyone."}
          </p>
          <div className="dl-form-actions">
            <button type="button" className="dl-btn ghost" onClick={() => setConfirm(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="dl-btn primary" onClick={doToggle} disabled={busy}>
              {busy ? "Saving…" : nextLabel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { setFolderVisibility } from "@/app/(public)/presentation-hub/actions";
import { ConfirmDialog } from "@/components/documents/confirm-dialog";

/**
 * Folder visibility status pill — 1:1 with the Document Library's VisibilityPopover
 * (D-079), wired to the presentation action. The pill never toggles on a plain
 * click: hover/click opens a popover with one action, which opens a confirm dialog;
 * only confirming calls setFolderVisibility. Super-admin only (non-admins get a
 * static pill from the caller). Private = admin-only (the hub is login-only).
 */
export function PresentationVisibilityPopover({ folderId, isPublic }: { folderId: string; isPublic: boolean }) {
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

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doToggle}
        tone="accent"
        title={isPublic ? "Make this folder private?" : "Make this folder public?"}
        message={
          isPublic
            ? "It will be hidden from everyone except admins. You can make it public again anytime."
            : "It will be visible to everyone. You can make it private again anytime."
        }
        confirmLabel={nextLabel}
        busy={busy}
        icon={isPublic ? <Lock size={24} aria-hidden="true" /> : <Globe size={24} aria-hidden="true" />}
      />
    </div>
  );
}

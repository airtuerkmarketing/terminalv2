"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/documents/modal";
import { deleteFolder, moveFolder } from "@/app/(public)/presentation-hub/actions";
import type { PresentationFolderDTO } from "@/lib/presentations";
import { invalidateMoveTargets, useMoveTargets } from "./move-targets";

type ActiveModal = "move" | "delete" | null;

/** ⋮ menu for the CURRENT folder — 1:1 with the Document Library's (D-079). The
 *  common actions live ON the object (Rename on the title, visibility on the
 *  status pill, New subfolder in the toolbar / empty-space menu), so this menu
 *  keeps only Move + Delete (delete is super-admin only). */
export function FolderActionsMenu({
  folder,
  isSuperAdmin,
}: {
  folder: PresentationFolderDTO;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dest, setDest] = useState<string>(folder.parentId ?? "");

  const { folders, loading: loadingTargets } = useMoveTargets(modal === "move");

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function open(m: ActiveModal) {
    setMenuOpen(false);
    setError(null);
    setDest(folder.parentId ?? "");
    setModal(m);
  }
  function after(res: { ok: boolean; error?: string }) {
    setBusy(false);
    if (res.ok) {
      invalidateMoveTargets();
      setModal(null);
      router.refresh();
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  }

  async function doMove() {
    setBusy(true);
    setError(null);
    after(await moveFolder(folder.id, dest || null));
  }
  async function doDelete() {
    setBusy(true);
    setError(null);
    const res = await deleteFolder(folder.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    setModal(null);
    invalidateMoveTargets();
    // This menu lives on the deleted folder's own page — go to the parent first.
    const segs = folder.path.split("/");
    const parentUrl =
      segs.length > 1 ? `/presentation-hub/${segs.slice(0, -1).join("/")}` : "/presentation-hub";
    router.push(parentUrl);
    router.refresh();
  }

  // Move targets: every folder except self and its own descendants.
  const moveTargets = folders.filter(
    (f) => f.id !== folder.id && !f.path.startsWith(folder.path + "/")
  );

  return (
    <div className="dl-folder-menu" ref={rootRef}>
      <button
        type="button"
        className="dl-iconbtn"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Folder actions"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      {menuOpen && (
        <div className="dl-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => open("move")}>
            Move
          </button>
          {isSuperAdmin && (
            <button type="button" role="menuitem" className="danger" onClick={() => open("delete")}>
              Delete folder
            </button>
          )}
        </div>
      )}

      <Modal open={modal === "move"} onClose={() => setModal(null)} title="Move folder" width={460}>
        <div className="dl-form">
          <label className="dl-field">
            <span>Destination</span>
            <select
              className="dl-input"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              disabled={loadingTargets}
            >
              <option value="">Top level</option>
              {moveTargets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="dl-error">{error}</p>}
          <div className="dl-form-actions">
            <button type="button" className="dl-btn ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="dl-btn primary" onClick={doMove} disabled={busy || loadingTargets}>
              {busy ? "Moving…" : "Move here"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete folder" width={460}>
        <div className="dl-form">
          <p className="dl-confirm-text">
            Delete <strong>{folder.name}</strong>? A folder that still contains presentations can’t be
            deleted — clear its files first. This can’t be undone.
          </p>
          {error && <p className="dl-error">{error}</p>}
          <div className="dl-form-actions">
            <button type="button" className="dl-btn ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="dl-btn danger" onClick={doDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete folder"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

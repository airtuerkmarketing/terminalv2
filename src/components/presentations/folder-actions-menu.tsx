"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { CreateFolderModal } from "./create-folder-modal";
import {
  deleteFolder,
  moveFolder,
  renameFolder,
  setFolderVisibility,
} from "@/app/(public)/presentation-hub/actions";
import type { PresentationFolderDTO } from "@/lib/presentations";
import { invalidateMoveTargets, useMoveTargets } from "./move-targets";

type ActiveModal = "create" | "rename" | "move" | "delete" | null;

/** ⋮ menu for the CURRENT folder (admin). Delete + visibility require super-admin.
 *  Private (D-079) = admin-only (the hub is login-only). */
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
  const [name, setName] = useState(folder.name);
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
    setName(folder.name);
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

  async function doRename() {
    setBusy(true);
    setError(null);
    after(await renameFolder(folder.id, name));
  }
  async function doMove() {
    setBusy(true);
    setError(null);
    after(await moveFolder(folder.id, dest || null));
  }
  async function doToggleVisibility() {
    setMenuOpen(false);
    const res = await setFolderVisibility(folder.id, !folder.isPublic);
    if (res.ok) router.refresh();
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
    <div className="ph-folder-menu" ref={rootRef}>
      <button
        type="button"
        className="ph-iconbtn"
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
        <div className="ph-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => open("create")}>
            New subfolder
          </button>
          <button type="button" role="menuitem" onClick={() => open("rename")}>
            Rename
          </button>
          <button type="button" role="menuitem" onClick={() => open("move")}>
            Move
          </button>
          {isSuperAdmin && (
            <>
              <button type="button" role="menuitem" onClick={doToggleVisibility}>
                {folder.isPublic ? "Make private" : "Make public"}
              </button>
              <div className="ph-menu-sep" />
              <button type="button" role="menuitem" className="danger" onClick={() => open("delete")}>
                Delete folder
              </button>
            </>
          )}
        </div>
      )}

      <CreateFolderModal open={modal === "create"} onClose={() => setModal(null)} parentId={folder.id} />

      <Modal open={modal === "rename"} onClose={() => setModal(null)} title="Rename folder" width={420}>
        <div className="ph-form">
          <label className="ph-field">
            <span>Folder name</span>
            <input className="ph-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {error && <p className="ph-error">{error}</p>}
          <div className="ph-form-actions">
            <button type="button" className="ph-btn ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="ph-btn primary" onClick={doRename} disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Rename"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "move"} onClose={() => setModal(null)} title="Move folder" width={460}>
        <div className="ph-form">
          <label className="ph-field">
            <span>Destination</span>
            <select className="ph-input" value={dest} onChange={(e) => setDest(e.target.value)} disabled={loadingTargets}>
              <option value="">Top level</option>
              {moveTargets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="ph-error">{error}</p>}
          <div className="ph-form-actions">
            <button type="button" className="ph-btn ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="ph-btn primary" onClick={doMove} disabled={busy || loadingTargets}>
              {busy ? "Moving…" : "Move here"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete folder" width={460}>
        <div className="ph-form">
          <p className="ph-confirm-text">
            Delete <strong>{folder.name}</strong>? A folder that still contains presentations can’t be
            deleted — clear its files first. This can’t be undone.
          </p>
          {error && <p className="ph-error">{error}</p>}
          <div className="ph-form-actions">
            <button type="button" className="ph-btn ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="ph-btn danger" onClick={doDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete folder"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

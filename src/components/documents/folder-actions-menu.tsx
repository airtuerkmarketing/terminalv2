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
} from "@/app/(public)/documents-library/actions";
import type { FolderDTO } from "@/lib/documents";

type ActiveModal = "create" | "rename" | "move" | "delete" | null;

/** ⋮ menu for the CURRENT folder. Rendered only for admins; super-admin-only
 *  items (visibility, delete) are gated by `isSuperAdmin`. */
export function FolderActionsMenu({
  folder,
  isSuperAdmin,
  allFolders,
}: {
  folder: FolderDTO;
  isSuperAdmin: boolean;
  allFolders: FolderDTO[];
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(folder.name);
  const [dest, setDest] = useState<string>(folder.parentId ?? "");

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
    // This menu lives on the current folder's own page, so its URL no longer
    // exists after deletion — navigate to the parent (or root) BEFORE refresh.
    const segs = folder.path.split("/");
    const parentUrl =
      segs.length > 1 ? `/documents-library/${segs.slice(0, -1).join("/")}` : "/documents-library";
    router.push(parentUrl);
    router.refresh();
  }
  async function toggleVisibility() {
    setMenuOpen(false);
    await setFolderVisibility(folder.id, !folder.isPublic);
    router.refresh();
  }

  // Move targets: every folder except self and its own descendants (can't nest
  // a folder inside itself). "Top level" = empty value.
  const moveTargets = allFolders.filter(
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
              <div className="dl-menu-sep" />
              <button type="button" role="menuitem" onClick={toggleVisibility}>
                {folder.isPublic ? "Make private" : "Make public"}
              </button>
              <button type="button" role="menuitem" className="danger" onClick={() => open("delete")}>
                Delete folder
              </button>
            </>
          )}
        </div>
      )}

      <CreateFolderModal open={modal === "create"} onClose={() => setModal(null)} parentId={folder.id} />

      <Modal open={modal === "rename"} onClose={() => setModal(null)} title="Rename folder" width={420}>
        <div className="dl-form">
          <label className="dl-field">
            <span>Folder name</span>
            <input className="dl-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {error && <p className="dl-error">{error}</p>}
          <div className="dl-form-actions">
            <button type="button" className="dl-btn ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="dl-btn primary" onClick={doRename} disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Rename"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "move"} onClose={() => setModal(null)} title="Move folder" width={460}>
        <div className="dl-form">
          <label className="dl-field">
            <span>Destination</span>
            <select className="dl-input" value={dest} onChange={(e) => setDest(e.target.value)}>
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
            <button type="button" className="dl-btn primary" onClick={doMove} disabled={busy}>
              {busy ? "Moving…" : "Move here"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete folder" width={460}>
        <div className="dl-form">
          <p className="dl-confirm-text">
            Delete <strong>{folder.name}</strong> and <strong>everything inside it</strong>
            (subfolders and files)? This can’t be undone.
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

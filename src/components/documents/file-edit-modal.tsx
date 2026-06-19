"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import {
  deleteFile,
  editFile,
  moveFile,
  replaceFile,
} from "@/app/(public)/documents-library/actions";
import {
  ALLOWED_EXT,
  LANGUAGES,
  MAX_BYTES,
  extFromFilename,
  formatBytes,
} from "@/lib/documents-constants";
import type { FileDTO, FolderDTO } from "@/lib/documents";

/** Manage a file: rename/description/language, move, replace contents, delete. */
export function FileEditModal({
  file,
  allFolders,
  onClose,
}: {
  file: FileDTO | null;
  allFolders: FolderDTO[];
  onClose: () => void;
}) {
  if (!file) return null;
  // key={file.id} → fresh useState per opened file (no setState-in-effect sync).
  return <Inner key={file.id} file={file} allFolders={allFolders} onClose={onClose} />;
}

function Inner({
  file,
  allFolders,
  onClose,
}: {
  file: FileDTO;
  allFolders: FolderDTO[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(file.title);
  const [description, setDescription] = useState(file.description ?? "");
  const [language, setLanguage] = useState<string>(file.language ?? "");
  const [folderId, setFolderId] = useState(file.folderId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function done(res: { ok: boolean; error?: string }) {
    setBusy(null);
    if (res.ok) {
      onClose();
      router.refresh();
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  }

  async function saveMeta() {
    setBusy("meta");
    setError(null);
    done(await editFile(file.id, { title, description, language: language || null }));
  }
  async function doMove() {
    if (folderId === file.folderId) return;
    setBusy("move");
    setError(null);
    done(await moveFile(file.id, folderId));
  }
  async function doReplace(f: File | undefined) {
    if (!f) return;
    const ext = extFromFilename(f.name);
    if (!ALLOWED_EXT.has(ext)) {
      setError("That file type isn't allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(f.size)} — over the 15 MB limit.`);
      return;
    }
    setBusy("replace");
    setError(null);
    const fd = new FormData();
    fd.set("file", f);
    done(await replaceFile(file.id, fd));
  }
  async function doDelete() {
    setBusy("delete");
    setError(null);
    done(await deleteFile(file.id));
  }

  return (
    <Modal open onClose={onClose} title="Manage file" width={520}>
      <div className="dl-form">
        <label className="dl-field">
          <span>Title</span>
          <input className="dl-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="dl-field">
          <span>Description</span>
          <textarea
            className="dl-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="dl-field">
          <span>Language</span>
          <select className="dl-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Neutral / not specified</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="dl-form-actions">
          <button type="button" className="dl-btn primary" onClick={saveMeta} disabled={busy !== null}>
            {busy === "meta" ? "Saving…" : "Save changes"}
          </button>
        </div>

        <hr className="dl-sep" />

        <div className="dl-field">
          <span>Move to folder</span>
          <div className="dl-inline-row">
            <select className="dl-input" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              {allFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="dl-btn ghost"
              onClick={doMove}
              disabled={busy !== null || folderId === file.folderId}
            >
              {busy === "move" ? "Moving…" : "Move"}
            </button>
          </div>
        </div>

        <label className="dl-field">
          <span>Replace contents</span>
          <input
            type="file"
            className="dl-input"
            onChange={(e) => doReplace(e.target.files?.[0])}
            disabled={busy !== null}
          />
        </label>

        {error && <p className="dl-error">{error}</p>}

        <hr className="dl-sep" />

        {confirmDelete ? (
          <div className="dl-confirm">
            <span>Delete “{file.title}” permanently?</span>
            <div className="dl-form-actions">
              <button type="button" className="dl-btn ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" className="dl-btn danger" onClick={doDelete} disabled={busy !== null}>
                {busy === "delete" ? "Deleting…" : "Delete file"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="dl-btn danger-ghost" onClick={() => setConfirmDelete(true)}>
            Delete file
          </button>
        )}
      </div>
    </Modal>
  );
}

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
  ACCEPT_ATTR,
  ALLOWED_EXT,
  LANGUAGES,
  MAX_BYTES,
  extFromFilename,
  formatBytes,
} from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { useMoveTargets } from "./move-targets";

/** Manage a file: rename/description/language, move, replace contents, delete. */
export function FileEditModal({
  file,
  onClose,
  onUpdated,
  onRemoved,
}: {
  file: FileDTO | null;
  onClose: () => void;
  onUpdated: (file: FileDTO) => void;
  onRemoved: (id: string) => void;
}) {
  if (!file) return null;
  // key={file.id} → fresh useState per opened file (no setState-in-effect sync).
  return (
    <Inner
      key={file.id}
      file={file}
      onClose={onClose}
      onUpdated={onUpdated}
      onRemoved={onRemoved}
    />
  );
}

function Inner({
  file,
  onClose,
  onUpdated,
  onRemoved,
}: {
  file: FileDTO;
  onClose: () => void;
  onUpdated: (file: FileDTO) => void;
  onRemoved: (id: string) => void;
}) {
  const router = useRouter();
  // Destination list is fetched lazily on open (cached for the session); the
  // modal mounts only when a file is being managed, so fetch unconditionally.
  const { folders, loading: loadingTargets } = useMoveTargets(true);
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
    const res = await editFile(file.id, { title, description, language: language || null });
    if (res.ok && res.file) onUpdated(res.file);
    done(res);
  }
  async function doMove() {
    if (folderId === file.folderId) return;
    setBusy("move");
    setError(null);
    const res = await moveFile(file.id, folderId);
    if (res.ok) onRemoved(file.id); // the file left this folder
    done(res);
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
    const res = await replaceFile(file.id, fd);
    if (res.ok && res.file) onUpdated(res.file);
    done(res);
  }
  async function doDelete() {
    setBusy("delete");
    setError(null);
    const res = await deleteFile(file.id);
    if (res.ok) onRemoved(file.id);
    done(res);
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
            <select
              className="dl-input"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={loadingTargets}
            >
              {loadingTargets ? (
                <option value={file.folderId}>Loading folders…</option>
              ) : (
                folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.path}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="dl-btn ghost"
              onClick={doMove}
              disabled={busy !== null || loadingTargets || folderId === file.folderId}
            >
              {busy === "move" ? "Moving…" : "Move"}
            </button>
          </div>
        </div>

        <label className="dl-field">
          <span>Replace contents</span>
          <input
            type="file"
            accept={ACCEPT_ATTR}
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

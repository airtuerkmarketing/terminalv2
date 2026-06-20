"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { uploadFile } from "@/app/(public)/documents-library/actions";
import {
  ACCEPT_ATTR,
  ACCEPT_HINT,
  ALLOWED_EXT,
  LANGUAGES,
  MAX_BYTES,
  extFromFilename,
  formatBytes,
} from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";

/** Drag-drop upload with EXTENSION-only validation (never file.type — browsers
 *  report .docx as octet-stream). On success the new row is handed up so the list
 *  updates in place (no F5). */
export function UploadModal({
  open,
  onClose,
  folderId,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  folderId: string;
  onUploaded: (file: FileDTO) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setLanguage("");
    setError(null);
  }
  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  function pick(f: File | null | undefined) {
    setError(null);
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
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[a-z0-9]+$/i, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("title", title);
    if (language) fd.set("language", language);
    const res = await uploadFile(folderId, fd);
    setBusy(false);
    if (res.ok) {
      if (res.file) onUploaded(res.file);
      reset();
      onClose();
      router.refresh(); // refresh server-derived bits (sidebar tree, counts)
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Upload file" width={500}>
      <form onSubmit={submit} className="dl-form">
        <div
          className={`dl-dropzone${dragOver ? " over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file ? (
            <div className="dl-drop-file">
              <strong>{file.name}</strong>
              <span>{formatBytes(file.size)}</span>
            </div>
          ) : (
            <div className="dl-drop-hint">
              <strong>Drop a file here or click to browse</strong>
              <span>{ACCEPT_HINT}</span>
            </div>
          )}
        </div>

        <label className="dl-field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Display name"
            className="dl-input"
          />
        </label>

        <label className="dl-field">
          <span>Language (optional)</span>
          <select className="dl-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Neutral / not specified</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="dl-error">{error}</p>}
        <div className="dl-form-actions">
          <button type="button" className="dl-btn ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="dl-btn primary" disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

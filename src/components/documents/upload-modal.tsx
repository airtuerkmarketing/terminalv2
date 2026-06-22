"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import {
  createDocumentUploadTicket,
  finalizeDocumentUpload,
} from "@/app/(public)/documents-library/actions";
import { createClient } from "@/lib/supabase/client";
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
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    // Two-step upload: (1) get a signed URL, (2) PUT the bytes straight to Storage
    // from the browser, (3) finalize the DB row. This bypasses the Next.js 1 MB
    // Server-Action body limit that made larger uploads hang silently. The whole
    // thing is wrapped so a thrown/rejected step always clears "Uploading…" and
    // surfaces an error instead of leaving the modal stuck.
    try {
      const finalTitle = title.trim() || file.name.replace(/\.[a-z0-9]+$/i, "");
      const ticket = await createDocumentUploadTicket(folderId, file.name);
      if (!ticket.ok) {
        setError(ticket.error);
        return;
      }
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: ticket.contentType });
      if (upErr) {
        setError("Upload failed — please try again.");
        return;
      }
      const res = await finalizeDocumentUpload(folderId, {
        fileId: ticket.fileId,
        ext: extFromFilename(file.name),
        title: finalTitle,
        language: language || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.file) onUploaded(res.file);
      reset();
      onClose();
      router.refresh(); // refresh server-derived bits (sidebar tree, counts)
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setBusy(false);
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

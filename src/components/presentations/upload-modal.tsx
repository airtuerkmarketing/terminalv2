"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { uploadPresentation } from "@/app/(public)/presentation-hub/actions";
import {
  ACCEPT_ATTR,
  ACCEPT_HINT,
  ALLOWED_EXT,
  LANGUAGES,
  MAX_BYTES,
  extFromFilename,
  formatBytes,
} from "@/lib/presentations-constants";
import type { PresentationFileDTO } from "@/lib/presentations";
import { usePresentationTags } from "./presentation-tags";

/** Drag-drop upload with EXTENSION-only validation. On success the new row is
 *  handed up so the list updates in place (no F5). */
export function UploadModal({
  open,
  onClose,
  folderId,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  folderId: string;
  onUploaded: (file: PresentationFileDTO) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { tags } = usePresentationTags(open);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setLanguage("");
    setTagIds([]);
    setError(null);
  }
  function close() {
    if (busy) return;
    reset();
    onClose();
  }
  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
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
      setError(`That file is ${formatBytes(f.size)} — over the 25 MB limit.`);
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
    if (tagIds.length > 0) fd.set("tags", tagIds.join(","));
    const res = await uploadPresentation(folderId, fd);
    setBusy(false);
    if (res.ok) {
      if (res.file) onUploaded(res.file);
      reset();
      onClose();
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Upload presentation" width={520}>
      <form onSubmit={submit} className="ph-form">
        <div
          className={`ph-dropzone${dragOver ? " over" : ""}`}
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
          <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={(e) => pick(e.target.files?.[0])} />
          {file ? (
            <div className="ph-drop-file">
              <strong>{file.name}</strong>
              <span>{formatBytes(file.size)}</span>
            </div>
          ) : (
            <div className="ph-drop-hint">
              <strong>Drop a file here or click to browse</strong>
              <span>{ACCEPT_HINT}</span>
            </div>
          )}
        </div>

        <label className="ph-field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Display name" className="ph-input" />
        </label>

        <label className="ph-field">
          <span>Language (optional)</span>
          <select className="ph-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Neutral / not specified</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        {tags.length > 0 && (
          <div className="ph-field">
            <span>Departments (optional)</span>
            <div className="ph-checkrow">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`ph-checkpill${tagIds.includes(t.id) ? " on" : ""}`}
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={tagIds.includes(t.id)}
                >
                  {t.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="ph-error">{error}</p>}
        <div className="ph-form-actions">
          <button type="button" className="ph-btn ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="ph-btn primary" disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

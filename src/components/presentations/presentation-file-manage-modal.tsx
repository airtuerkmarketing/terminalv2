"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import {
  deletePresentation,
  editPresentationMetadata,
  movePresentation,
  replacePresentation,
} from "@/app/(public)/presentation-hub/actions";
import {
  ACCEPT_ATTR,
  ALLOWED_EXT,
  LANGUAGES,
  MAX_BYTES,
  extFromFilename,
  formatBytes,
} from "@/lib/presentations-constants";
import type { PresentationFileDTO } from "@/lib/presentations";
import { useMoveTargets } from "./move-targets";
import { usePresentationTags } from "./presentation-tags";

/** Manage a presentation: metadata + tags + featured, move, replace contents,
 *  delete. Replace creates a NEW version (new id), so it removes the old row and
 *  adds the new one in the list. */
export function PresentationFileManageModal({
  file,
  onClose,
  onUpdated,
  onRemoved,
}: {
  file: PresentationFileDTO | null;
  onClose: () => void;
  onUpdated: (file: PresentationFileDTO) => void;
  onRemoved: (id: string) => void;
}) {
  if (!file) return null;
  return <Inner key={file.id} file={file} onClose={onClose} onUpdated={onUpdated} onRemoved={onRemoved} />;
}

function Inner({
  file,
  onClose,
  onUpdated,
  onRemoved,
}: {
  file: PresentationFileDTO;
  onClose: () => void;
  onUpdated: (file: PresentationFileDTO) => void;
  onRemoved: (id: string) => void;
}) {
  const router = useRouter();
  const { folders, loading: loadingTargets } = useMoveTargets(true);
  const { tags } = usePresentationTags(true);
  const [title, setTitle] = useState(file.title);
  const [description, setDescription] = useState(file.description ?? "");
  const [language, setLanguage] = useState<string>(file.language ?? "");
  const [tagIds, setTagIds] = useState<string[]>(file.tags.map((t) => t.id));
  const [isFeatured, setIsFeatured] = useState(file.isFeatured);
  const [featuredUntil, setFeaturedUntil] = useState(toLocalInput(file.featuredUntil));
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
  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function saveMeta() {
    setBusy("meta");
    setError(null);
    const res = await editPresentationMetadata(file.id, {
      title,
      description,
      language: language || null,
      tagIds,
      isFeatured,
      featuredUntil: isFeatured ? featuredUntil || null : null,
    });
    if (res.ok && res.file) onUpdated(res.file);
    done(res);
  }
  async function doMove() {
    if (folderId === file.folderId) return;
    setBusy("move");
    setError(null);
    const res = await movePresentation(file.id, folderId);
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
      setError(`That file is ${formatBytes(f.size)} — over the 25 MB limit.`);
      return;
    }
    setBusy("replace");
    setError(null);
    const fd = new FormData();
    fd.set("file", f);
    const res = await replacePresentation(file.id, fd);
    // Replace returns a NEW row (new id) and archives the old one — swap in the list.
    if (res.ok && res.file) {
      onRemoved(file.id);
      onUpdated(res.file);
    }
    done(res);
  }
  async function doDelete() {
    setBusy("delete");
    setError(null);
    const res = await deletePresentation(file.id);
    if (res.ok) onRemoved(file.id);
    done(res);
  }

  return (
    <Modal open onClose={onClose} title="Manage presentation" width={540}>
      <div className="ph-form">
        <label className="ph-field">
          <span>Title</span>
          <input className="ph-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="ph-field">
          <span>Description</span>
          <textarea className="ph-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="ph-field">
          <span>Language</span>
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
            <span>Departments</span>
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

        <div className="ph-field">
          <label className="ph-toggle">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            <span>Featured on the hub</span>
          </label>
          {isFeatured && (
            <input
              type="datetime-local"
              className="ph-input"
              value={featuredUntil}
              onChange={(e) => setFeaturedUntil(e.target.value)}
              aria-label="Featured until (optional)"
            />
          )}
        </div>

        <div className="ph-form-actions">
          <button type="button" className="ph-btn primary" onClick={saveMeta} disabled={busy !== null}>
            {busy === "meta" ? "Saving…" : "Save changes"}
          </button>
        </div>

        <hr className="ph-sep" />

        <div className="ph-field">
          <span>Move to folder</span>
          <div className="ph-inline-row">
            <select
              className="ph-input"
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
              className="ph-btn ghost"
              onClick={doMove}
              disabled={busy !== null || loadingTargets || folderId === file.folderId}
            >
              {busy === "move" ? "Moving…" : "Move"}
            </button>
          </div>
        </div>

        <label className="ph-field">
          <span>Replace contents (keeps version history)</span>
          <input
            type="file"
            accept={ACCEPT_ATTR}
            className="ph-input"
            onChange={(e) => doReplace(e.target.files?.[0])}
            disabled={busy !== null}
          />
        </label>

        {error && <p className="ph-error">{error}</p>}

        <hr className="ph-sep" />

        {confirmDelete ? (
          <div className="ph-confirm">
            <span>Delete “{file.title}” permanently?</span>
            <div className="ph-form-actions">
              <button type="button" className="ph-btn ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" className="ph-btn danger" onClick={doDelete} disabled={busy !== null}>
                {busy === "delete" ? "Deleting…" : "Delete presentation"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="ph-btn danger-ghost" onClick={() => setConfirmDelete(true)}>
            Delete presentation
          </button>
        )}
      </div>
    </Modal>
  );
}

/** ISO → value for <input type="datetime-local"> (local, no seconds), or "". */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

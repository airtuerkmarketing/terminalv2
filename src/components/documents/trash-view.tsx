"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import "@/styles/document-library.css";
import {
  deleteFilePermanently,
  emptyTrash,
  restoreFile,
} from "@/app/(public)/documents-library/actions";
import type { TrashedFileDTO } from "@/lib/documents";
import { fileKind, formatBytes, type FileKind } from "@/lib/documents-constants";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "./confirm-dialog";

// Self-drawn format badges (same palette as the sidebar/file badges).
const BADGE: Record<FileKind, { label: string; color: string }> = {
  pdf:   { label: "PDF", color: "#D8352A" },
  word:  { label: "DOC", color: "#185FA5" },
  excel: { label: "XLS", color: "#3B6D11" },
  ppt:   { label: "PPT", color: "#BA7517" },
  image: { label: "IMG", color: "#7C3AED" },
  txt:   { label: "TXT", color: "#6B7280" },
  zip:   { label: "ZIP", color: "#6B7280" },
  file:  { label: "FILE", color: "#6B7280" },
};

/**
 * Trash view (D-076): every soft-deleted file with its origin folder, time left
 * before auto-purge, and Restore / Delete-forever actions, plus Empty trash.
 * Admin-only (the route gates it). Files are kept `retentionDays` days, then a
 * daily cron removes them.
 */
export function TrashView({
  files,
  retentionDays,
}: {
  files: TrashedFileDTO[];
  retentionDays: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<TrashedFileDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);

  async function onRestore(f: TrashedFileDTO) {
    setBusyId(f.id);
    const res = await restoreFile(f.id);
    setBusyId(null);
    if (res.ok) {
      toast({ title: `Restored “${f.title}”`, variant: "success" });
      router.refresh();
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  async function onDeleteForever() {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await deleteFilePermanently(confirmDel.id);
    setDeleting(false);
    if (res.ok) {
      setConfirmDel(null);
      toast({ title: "File deleted permanently", variant: "success" });
      router.refresh();
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  async function onEmpty() {
    setEmptying(true);
    const res = await emptyTrash();
    setEmptying(false);
    if (res.ok) {
      setConfirmEmpty(false);
      toast({ title: "Trash emptied", variant: "success" });
      router.refresh();
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  return (
    <article className="document-library">
      <nav className="dl-breadcrumb" aria-label="Breadcrumb">
        <a className="dl-crumb" href="/documents-library">
          Documents Library
        </a>
        <span className="dl-crumb-sep" aria-hidden="true">
          ›
        </span>
        <span className="dl-crumb current" aria-current="page">
          Trash
        </span>
      </nav>

      <header className="dl-head">
        <div className="dl-head-title">
          <h1>Trash</h1>
        </div>
        {files.length > 0 && (
          <button type="button" className="dl-btn danger" onClick={() => setConfirmEmpty(true)}>
            <Trash2 size={16} aria-hidden="true" /> Empty trash
          </button>
        )}
      </header>

      <p className="dl-trash-note">
        Deleted files are kept here for {retentionDays} days, then removed automatically.
      </p>

      {files.length === 0 ? (
        <div className="dl-empty">
          <strong>Trash is empty.</strong>
          <span>Deleted files will appear here for {retentionDays} days.</span>
        </div>
      ) : (
        <ul className="dl-trash-list">
          {files.map((f) => {
            const b = BADGE[fileKind(f.extension)];
            const busy = busyId === f.id;
            return (
              <li key={f.id} className="dl-trash-row">
                <span className="dl-file-badge" style={{ background: b.color }}>
                  {b.label}
                </span>
                <span className="dl-trash-main">
                  <span className="dl-trash-name" title={f.title}>
                    {f.title}
                  </span>
                  <span className="dl-trash-meta">
                    from {f.folderName} · {formatBytes(f.sizeBytes)}
                  </span>
                </span>
                <span className={`dl-trash-left${f.daysLeft <= 3 ? " is-soon" : ""}`}>
                  {f.daysLeft === 0 ? "due today" : `${f.daysLeft} ${f.daysLeft === 1 ? "day" : "days"} left`}
                </span>
                <span className="dl-trash-actions">
                  <button
                    type="button"
                    className="dl-btn ghost"
                    onClick={() => onRestore(f)}
                    disabled={busy}
                  >
                    <RotateCcw size={15} aria-hidden="true" /> Restore
                  </button>
                  <button
                    type="button"
                    className="dl-btn danger"
                    onClick={() => setConfirmDel(f)}
                    disabled={busy}
                  >
                    Delete forever
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDeleteForever}
        tone="danger"
        title="Delete this file forever?"
        message={`“${confirmDel?.title ?? ""}” will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete forever"
        busy={deleting}
        icon={<Trash2 size={24} aria-hidden="true" />}
      />
      <ConfirmDialog
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        onConfirm={onEmpty}
        tone="danger"
        title="Empty the trash?"
        message="Every file in the trash will be permanently removed. This cannot be undone."
        confirmLabel="Empty trash"
        busy={emptying}
        icon={<Trash2 size={24} aria-hidden="true" />}
      />
    </article>
  );
}

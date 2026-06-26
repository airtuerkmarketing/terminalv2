"use client";

import { useEffect, useRef, useState } from "react";
import { fileKind, formatBytes } from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { deleteFile, editFile } from "@/app/(public)/documents-library/actions";
import { FlagIcon } from "@/components/ui/flag-icon";
import { RelativeTime } from "./relative-time";
import { FileTypeGraphic } from "./file-type-graphic";
import { FileObject } from "./file-object";

function fileHref(id: string, download = false) {
  return `/api/library/file/${id}${download ? "?download=1" : ""}`;
}

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export type CtxItem =
  | { kind: "item"; label: string; onClick: () => void; danger?: boolean }
  | { kind: "sep" };

/** Right-click popover at the cursor; closes on outside-click / Esc / scroll. */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  return (
    <div ref={ref} className="dl-ctx" role="menu" style={{ left: x, top: y }}>
      {items.map((it, i) =>
        it.kind === "sep" ? (
          <div key={i} className="dl-ctx-sep" />
        ) : (
          <button key={i} type="button" role="menuitem" className={`dl-ctx-item${it.danger ? " danger" : ""}`} onClick={() => { it.onClick(); onClose(); }}>
            {it.label}
          </button>
        )
      )}
    </div>
  );
}

/**
 * One file in the document grid.
 *   - "card" → Windows-Explorer-style free-standing cell: a typed FileObject SVG,
 *     the name (inline-rename on click), then flag + size. No box; hover gives a
 *     subtle bg. Whole cell opens the file; right-click = context menu. Rename /
 *     move / delete reuse the existing handlers (editFile / FileEditModal /
 *     deleteFile) with live grid updates via onUpdated / onRemoved.
 *   - "grid" → compact .dl-grid-tile (unchanged).
 */
export function FileCard({
  file,
  view,
  isSuperAdmin,
  onManage,
  onUpdated,
  onRemoved,
}: {
  file: FileDTO;
  view: "grid" | "card";
  isSuperAdmin: boolean;
  onManage: (file: FileDTO) => void;
  onUpdated: (file: FileDTO) => void;
  onRemoved: (id: string) => void;
}) {
  const kind = fileKind(file.extension);
  const isImage = kind === "image";
  const href = fileHref(file.id);
  const downloadHref = fileHref(file.id, true);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.title);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const openFile = () => window.open(href, "_blank", "noopener,noreferrer");

  const startRename = () => { setName(file.title); setEditing(true); };
  async function commitRename() {
    setEditing(false);
    const t = name.trim();
    if (!t || t === file.title) { setName(file.title); return; }
    const res = await editFile(file.id, { title: t });
    if (res.ok && res.file) onUpdated(res.file);
    else setName(file.title);
  }
  async function doDelete() {
    const res = await deleteFile(file.id);
    if (res.ok) onRemoved(file.id);
  }

  // ── Card view (free-standing explorer cell) ──────────────────────────────
  if (view === "card") {
    const items: CtxItem[] = [
      { kind: "item", label: "Öffnen", onClick: openFile },
      { kind: "item", label: "Herunterladen", onClick: () => window.open(downloadHref, "_blank", "noopener,noreferrer") },
    ];
    if (isSuperAdmin) {
      items.push(
        { kind: "item", label: "Umbenennen", onClick: startRename },
        { kind: "item", label: "Verschieben", onClick: () => onManage(file) },
        { kind: "sep" },
        { kind: "item", label: "Löschen", onClick: doDelete, danger: true },
      );
    }
    return (
      <div
        className="dl-cell"
        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      >
        <button type="button" className="dl-cell__hit" onClick={openFile} aria-label={`Open ${file.title}`}>
          <span className="dl-cell__visual">
            <FileObject kind={kind} imageUrl={isImage ? href : undefined} />
          </span>
        </button>

        {editing ? (
          <input
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            className="dl-cell__rename"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              else if (e.key === "Escape") { setName(file.title); setEditing(false); }
            }}
            onBlur={commitRename}
            aria-label="Rename file"
          />
        ) : (
          <button
            type="button"
            className="dl-cell__name"
            title={file.title}
            onClick={(e) => { e.stopPropagation(); if (isSuperAdmin) startRename(); }}
          >
            {file.title}
          </button>
        )}

        <div className="dl-cell__sub">
          <FlagIcon code={file.language} />
          <span>{formatBytes(file.sizeBytes)}</span>
        </div>

        {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
      </div>
    );
  }

  // ── Grid view (compact — unchanged) ──────────────────────────────────────
  return (
    <div className="dl-grid-tile">
      <div className="dl-grid-tile__cover">
        <a
          className="dl-grid-tile__preview"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${file.title}`}
        >
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
            <img className="dl-grid-tile__thumb" src={href} alt="" loading="lazy" decoding="async" />
          ) : (
            <FileTypeGraphic extension={file.extension} />
          )}
        </a>
      </div>

      <div className="dl-grid-tile__foot">
        <div className="dl-grid-tile__title" title={file.title}>
          {file.title}
        </div>

        <div className="dl-grid-tile__meta">
          <FlagIcon code={file.language} />
          <span>{formatBytes(file.sizeBytes)}</span>
          <span aria-hidden="true">·</span>
          <RelativeTime iso={file.createdAt} />
        </div>

        <div className="dl-grid-tile__actions">
          <a className="dl-grid-tile__dl" href={downloadHref} aria-label={`Download ${file.title}`}>
            <DownloadIcon />
            Download
          </a>
          {isSuperAdmin && (
            <button
              type="button"
              className="dl-grid-tile__edit"
              onClick={() => onManage(file)}
              aria-label={`Edit ${file.title}`}
            >
              <EditIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { fileKind, formatBytes, type FileKind } from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { FlagIcon } from "@/components/ui/flag-icon";
import { RelativeTime } from "./relative-time";
import { FileTypeGraphic } from "./file-type-graphic";

// Format monogram: shown ONCE per card (replaces the old badge + doc-icon + pill
// trio). Self-drawn label + colour — no app logos.
const MONO: Record<FileKind, { label: string; color: string }> = {
  pdf:   { label: "PDF", color: "#D8352A" },
  word:  { label: "DOC", color: "#185FA5" },
  excel: { label: "XLS", color: "#3B6D11" },
  ppt:   { label: "PPT", color: "#BA7517" },
  image: { label: "IMG", color: "#7C3AED" },
  txt:   { label: "TXT", color: "#6B7280" },
  zip:   { label: "ZIP", color: "#6B7280" },
  file:  { label: "FILE", color: "#6B7280" },
};

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

/**
 * One file in the document grid. The SAME data renders two distinct tiles
 * depending on the active view:
 *   - "grid" → .dl-grid-tile (compact, 4/3 cover + roomy foot — unchanged from
 *     the long-standing grid card; visual diff vs. before = 0).
 *   - "card" → .dl-tile (Option A: 16/10 cover with a filetype badge top-left and
 *     an always-visible Edit overlay top-right, then a tight meta row with a
 *     one-line title and an always-visible Download button bottom-right).
 * Download is for everyone; Edit (manage modal) stays super_admin-only, matching
 * the rest of the library's management UI.
 */
export function FileCard({
  file,
  view,
  isSuperAdmin,
  onManage,
}: {
  file: FileDTO;
  view: "grid" | "card";
  isSuperAdmin: boolean;
  onManage: (file: FileDTO) => void;
}) {
  const kind = fileKind(file.extension);
  const isImage = kind === "image";
  const href = fileHref(file.id);
  const downloadHref = fileHref(file.id, true);

  // ── Card view (Variant D: single format monogram, no format word / doc-icon /
  //    duplicate badge) ───────────────────────────────────────────────────────
  if (view === "card") {
    const mono = MONO[kind];
    // word/file show the real extension (DOC/DOCX/…); others use the kind label.
    const monoLabel = (kind === "word" || kind === "file") && file.extension ? file.extension.toUpperCase() : mono.label;
    return (
      <div className="dl-tile">
        {/* Stretched open-link: the whole card opens the file. The action buttons
            sit above it (higher z-index), so clicking them never triggers open. */}
        <a
          className="dl-tile__open"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${file.title}`}
        />
        <div className="dl-tile__head">
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
            <img className="dl-tile__thumb" src={href} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="dl-mono" style={{ background: mono.color }}>{monoLabel}</span>
          )}
        </div>

        <div className="dl-tile__actions">
          {isSuperAdmin && (
            <button
              type="button"
              className="dl-tile__act"
              onClick={(e) => { e.stopPropagation(); onManage(file); }}
              aria-label={`Edit ${file.title}`}
            >
              <EditIcon />
            </button>
          )}
          <a
            className="dl-tile__act"
            href={downloadHref}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Download ${file.title}`}
          >
            <DownloadIcon />
          </a>
        </div>

        <div className="dl-tile__meta">
          <div className="dl-tile__title" title={file.title}>
            {file.title}
          </div>
          <div className="dl-tile__sub">
            <FlagIcon code={file.language} />
            <span>{formatBytes(file.sizeBytes)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Grid view (compact — unchanged appearance, renamed to .dl-grid-tile) ────
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

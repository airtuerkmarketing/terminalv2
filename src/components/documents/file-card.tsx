"use client";

import { fileKind, fileKindLabel, formatBytes } from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { RelativeTime } from "./relative-time";

function fileHref(id: string, download = false) {
  return `/api/library/file/${id}${download ? "?download=1" : ""}`;
}

/** Grid card: image thumbnail OR type badge, title, size + relative time, ⋮ (admin). */
export function FileCard({
  file,
  isAdmin,
  onManage,
}: {
  file: FileDTO;
  isAdmin: boolean;
  onManage: (file: FileDTO) => void;
}) {
  const kind = fileKind(file.extension);
  const isImage = kind === "image";
  const href = fileHref(file.id);
  const downloadHref = fileHref(file.id, true);

  return (
    <div className="dl-card">
      <div className="dl-cover">
        <a
          className="dl-card-preview"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${file.title}`}
        >
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
            <img className="dl-thumb" src={href} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className={`dl-ft ft-${kind}`} aria-hidden="true">
              {fileKindLabel(file.extension)}
            </span>
          )}
        </a>
        {/* download button — top-right of the cover (reuses block-system .card-dl) */}
        <a className="card-dl" href={downloadHref} aria-label={`Download ${file.title}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      </div>

      <div className="dl-card-foot">
        <div className="dl-card-info">
          {file.language && <span className="dl-lang">{file.language.toUpperCase()}</span>}
          <div className="dl-card-title" title={file.title}>
            {file.title}
          </div>
          <div className="dl-card-sub">
            <span>{formatBytes(file.sizeBytes)}</span>
            <span aria-hidden="true">·</span>
            <RelativeTime iso={file.createdAt} />
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="dl-card-menu"
            onClick={() => onManage(file)}
            aria-label={`Manage ${file.title}`}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

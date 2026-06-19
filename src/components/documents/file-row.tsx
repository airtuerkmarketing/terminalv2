"use client";

import { fileKind, fileKindLabel, formatBytes } from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { RelativeTime } from "./relative-time";

/** List row: type badge + title + meta + one download affordance + ⋮ (admin). */
export function FileRow({
  file,
  isAdmin,
  onManage,
}: {
  file: FileDTO;
  isAdmin: boolean;
  onManage: (file: FileDTO) => void;
}) {
  const kind = fileKind(file.extension);
  const href = `/api/library/file/${file.id}`;

  return (
    <div className="dl-row">
      <a className="dl-row-main" href={href} target="_blank" rel="noopener noreferrer">
        <span className={`dl-ft sm ft-${kind}`} aria-hidden="true">
          {fileKindLabel(file.extension)}
        </span>
        <span className="dl-row-info">
          <span className="dl-row-title">
            {file.title}
            {file.language && <span className="dl-lang inline">{file.language.toUpperCase()}</span>}
          </span>
          <span className="dl-row-sub">
            <span>{formatBytes(file.sizeBytes)}</span>
            <span aria-hidden="true">·</span>
            <RelativeTime iso={file.createdAt} />
          </span>
        </span>
      </a>
      <div className="dl-row-actions">
        <a
          className="dl-icon-btn"
          href={`${href}?download=1`}
          aria-label={`Download ${file.title}`}
          title="Download"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
        {isAdmin && (
          <button
            type="button"
            className="dl-icon-btn"
            onClick={() => onManage(file)}
            aria-label={`Manage ${file.title}`}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

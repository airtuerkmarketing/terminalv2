"use client";

import { fileKind, formatBytes } from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { FlagIcon } from "@/components/ui/flag-icon";
import { RelativeTime } from "./relative-time";
import { FileTypeGraphic } from "./file-type-graphic";

/**
 * One row of the iOS-grouped list. Cells sit on the shared column grid defined in
 * document-library.css (.dl-list-head / .dl-row): type · name · language · size ·
 * modified · actions. Images show a real square thumbnail; other types show the
 * Task-12 file-type graphic at a small scale (banner visible).
 */
export function FileRow({
  file,
  isSuperAdmin,
  onManage,
}: {
  file: FileDTO;
  isSuperAdmin: boolean;
  onManage: (file: FileDTO) => void;
}) {
  const isImage = fileKind(file.extension) === "image";
  const href = `/api/library/file/${file.id}`;

  return (
    <div className="dl-row">
      <span className="dl-row-type">
        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
          <img className="dl-row-thumb" src={href} alt="" loading="lazy" decoding="async" />
        ) : (
          <FileTypeGraphic extension={file.extension} scale={0.56} />
        )}
      </span>

      <a
        className="dl-row-name"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={file.title}
      >
        {file.title}
      </a>

      <span className="dl-row-lang">
        <FlagIcon code={file.language} />
      </span>

      <span className="dl-row-size">{formatBytes(file.sizeBytes)}</span>

      <span className="dl-row-modified">
        <RelativeTime iso={file.createdAt} />
      </span>

      <span className="dl-row-actions">
        <a
          className="card-dl"
          href={`${href}?download=1`}
          aria-label={`Download ${file.title}`}
          title="Download"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
        {isSuperAdmin && (
          <button
            type="button"
            className="dl-card-menu"
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
      </span>
    </div>
  );
}

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

  return (
    <div className="dl-card">
      <a className="dl-card-preview" href={href} target="_blank" rel="noopener noreferrer">
        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
          <img className="dl-thumb" src={href} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className={`dl-ft ft-${kind}`} aria-hidden="true">
            {fileKindLabel(file.extension)}
          </span>
        )}
        {file.language && <span className="dl-lang">{file.language.toUpperCase()}</span>}
      </a>

      <div className="dl-card-foot">
        <div className="dl-card-info">
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

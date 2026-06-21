"use client";

import { formatBytes } from "@/lib/presentations-constants";
import type { PresentationFileDTO } from "@/lib/presentations";
import { RelativeTime } from "./relative-time";
import { PresentationTypeIcon } from "./presentation-type-icon";
import { PresentationTagPill } from "./presentation-tag-pill";

/** Source served via the gated route; no param → route decides inline vs download
 *  (PDF/images inline, PPT/PPTX download). `?download=1` forces a download. */
function fileHref(id: string, download = false) {
  return `/api/presentations/file/${id}${download ? "?download=1" : ""}`;
}
function thumbHref(id: string) {
  return `/api/presentations/file/${id}?asset=thumb`;
}

/** Grid card: real thumbnail (image uploads) OR type icon (PDF/PPT), title,
 *  meta line, department tags, ⋮ manage (admin), download. */
export function PresentationCard({
  file,
  isAdmin,
  onManage,
}: {
  file: PresentationFileDTO;
  isAdmin: boolean;
  onManage: (file: PresentationFileDTO) => void;
}) {
  const href = fileHref(file.id);
  const hasThumb = file.processingStatus === "thumbnail";

  return (
    <div className="ph-card">
      <div className="ph-cover">
        {file.isFeatured && <span className="ph-featured">★ Featured</span>}
        <a
          className="ph-card-preview"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${file.title}`}
        >
          {hasThumb ? (
            /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
            <img className="ph-thumb" src={thumbHref(file.id)} alt="" loading="lazy" decoding="async" />
          ) : (
            <PresentationTypeIcon extension={file.fileType} />
          )}
        </a>
        {isAdmin && (
          <button
            type="button"
            className="ph-card-menu"
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

      <div className="ph-card-foot">
        <div className="ph-card-info">
          <div className="ph-card-title" title={file.title}>
            {file.title}
          </div>
          <div className="ph-card-sub">
            {file.language && (
              <>
                <span className="ph-lang">{file.language.toUpperCase()}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{file.fileType.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(file.sizeBytes)}</span>
            <span aria-hidden="true">·</span>
            <RelativeTime iso={file.createdAt} />
          </div>
          {file.tags.length > 0 && (
            <div className="ph-tags">
              {file.tags.map((t) => (
                <PresentationTagPill key={t.id} tag={t} />
              ))}
            </div>
          )}
        </div>
        <a className="ph-dl" href={fileHref(file.id, true)} aria-label={`Download ${file.title}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  );
}

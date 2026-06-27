"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/presentations-constants";
import type { PresentationFileDTO } from "@/lib/presentations";
import { FlagIcon } from "@/components/ui/flag-icon";
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

// Image types preview from the source (served inline) — like the Document Library;
// no dependency on the (Stufe-3) thumbnail pipeline, which is why image uploads
// showed only a type icon before.
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

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
 * One presentation in the grid. The SAME data renders two distinct tiles by view:
 *   - "grid" → .ph-grid-tile (compact, unchanged from the long-standing card:
 *     4/3 cover, featured ribbon, 2-line title, meta, tags, action bar).
 *   - "card" → .ph-tile (Option A, adapted for presentations): 16/10 cover with a
 *     filetype badge + featured star top-left and an always-visible Edit overlay
 *     top-right, then a tight meta row (flag · type · size) with an always-visible
 *     Download bottom-right. Tags are omitted in this compact tile (they stay in
 *     grid/list view) to keep the card short.
 * Download is for everyone; Edit (manage modal) stays super_admin-only.
 */
export function PresentationCard({
  file,
  view,
  isSuperAdmin,
  onManage,
}: {
  file: PresentationFileDTO;
  view: "grid" | "card";
  isSuperAdmin: boolean;
  onManage: (file: PresentationFileDTO) => void;
}) {
  const href = fileHref(file.id);
  const downloadHref = fileHref(file.id, true);
  const isImage = IMAGE_EXTS.has(file.fileType.toLowerCase());
  const hasThumb = file.processingStatus === "thumbnail";
  const [imgError, setImgError] = useState(false);
  // Images preview from the SOURCE; others use the generated cover thumbnail if any.
  const previewSrc = isImage ? href : thumbHref(file.id);
  const showPreviewImg = (isImage || hasThumb) && !imgError;

  const preview = showPreviewImg ? (
    /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
    <img src={previewSrc} alt="" loading="lazy" decoding="async" onError={() => setImgError(true)} />
  ) : (
    <PresentationTypeIcon extension={file.fileType} />
  );

  // ── Card view (Option A, adapted) ─────────────────────────────────────────
  if (view === "card") {
    return (
      <div className="ph-tile">
        <div className="ph-tile__cover">
          <a
            className="ph-tile__preview"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${file.title}`}
          >
            {preview}
          </a>
          <div className="ph-tile__badges">
            {file.isFeatured && (
              <span className="ph-tile__featured" title="Featured" aria-label="Featured">
                ★
              </span>
            )}
            <span className="ph-tile__badge">{file.fileType.toUpperCase()}</span>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              className="ph-tile__edit"
              onClick={() => onManage(file)}
              aria-label={`Edit ${file.title}`}
            >
              <EditIcon />
            </button>
          )}
        </div>

        <div className="ph-tile__meta">
          <div className="ph-tile__title" title={file.title}>
            {file.title}
          </div>
          <div className="ph-tile__sub">
            <FlagIcon code={file.language} />
            <span>{file.fileType.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(file.sizeBytes)}</span>
          </div>
          <a
            className="ph-tile__download"
            href={downloadHref}
            aria-label={`Download ${file.title}`}
          >
            <DownloadIcon />
          </a>
        </div>
      </div>
    );
  }

  // ── Grid view (compact — unchanged appearance, renamed to .ph-grid-tile) ────
  return (
    <div className="ph-grid-tile">
      <div className="ph-grid-tile__cover">
        {file.isFeatured && <span className="ph-featured">★ Featured</span>}
        <a
          className="ph-grid-tile__preview"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${file.title}`}
        >
          {showPreviewImg ? (
            /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
            <img className="ph-grid-tile__thumb" src={previewSrc} alt="" loading="lazy" decoding="async" onError={() => setImgError(true)} />
          ) : (
            <PresentationTypeIcon extension={file.fileType} />
          )}
        </a>
      </div>

      <div className="ph-grid-tile__foot">
        <div className="ph-grid-tile__title" title={file.title}>
          {file.title}
        </div>

        <div className="ph-grid-tile__meta">
          <FlagIcon code={file.language} />
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

        <div className="ph-grid-tile__actions">
          <a className="ph-grid-tile__dl" href={downloadHref} aria-label={`Download ${file.title}`}>
            <DownloadIcon />
            Download
          </a>
          {isSuperAdmin && (
            <button
              type="button"
              className="ph-grid-tile__edit"
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

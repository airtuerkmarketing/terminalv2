"use client";

import { fileKind, formatBytes, languageFlag } from "@/lib/documents-constants";
import type { FileDTO } from "@/lib/documents";
import { RelativeTime } from "./relative-time";
import { FileTypeGraphic } from "./file-type-graphic";

function fileHref(id: string, download = false) {
  return `/api/library/file/${id}${download ? "?download=1" : ""}`;
}

/**
 * Grid card (Option A): thumbnail/badge cover, 2-line title, stacked meta
 * (flag · size · date), and an always-visible action bar — Download for
 * everyone, Edit (manage modal) for super_admin only.
 */
export function FileCard({
  file,
  isSuperAdmin,
  onManage,
}: {
  file: FileDTO;
  isSuperAdmin: boolean;
  onManage: (file: FileDTO) => void;
}) {
  const kind = fileKind(file.extension);
  const isImage = kind === "image";
  const href = fileHref(file.id);
  const downloadHref = fileHref(file.id, true);
  const flag = languageFlag(file.language);

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
            <FileTypeGraphic extension={file.extension} />
          )}
        </a>
      </div>

      <div className="dl-card-foot">
        <div className="dl-card-title" title={file.title}>
          {file.title}
        </div>

        <div className="dl-card-meta">
          {flag && (
            <span className="dl-flag" aria-label={`Language: ${file.language}`}>
              {flag}
            </span>
          )}
          <span>{formatBytes(file.sizeBytes)}</span>
          <span aria-hidden="true">·</span>
          <RelativeTime iso={file.createdAt} />
        </div>

        <div className="dl-card-actions">
          <a className="dl-card-dl" href={downloadHref} aria-label={`Download ${file.title}`}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </a>
          {isSuperAdmin && (
            <button
              type="button"
              className="dl-card-edit"
              onClick={() => onManage(file)}
              aria-label={`Manage ${file.title}`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

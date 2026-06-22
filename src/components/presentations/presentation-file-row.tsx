"use client";

import { formatBytes } from "@/lib/presentations-constants";
import type { PresentationFileDTO } from "@/lib/presentations";
import { FlagIcon } from "@/components/ui/flag-icon";
import { RelativeTime } from "./relative-time";
import { PresentationTypeIcon } from "./presentation-type-icon";

function fileHref(id: string, download = false) {
  return `/api/presentations/file/${id}${download ? "?download=1" : ""}`;
}

/** One list row: type · name · language · size · modified · actions. Images show
 *  a real square thumbnail; other types show the type icon. */
export function PresentationFileRow({
  file,
  isSuperAdmin,
  onManage,
}: {
  file: PresentationFileDTO;
  isSuperAdmin: boolean;
  onManage: (file: PresentationFileDTO) => void;
}) {
  const href = fileHref(file.id);
  const hasThumb = file.processingStatus === "thumbnail";

  return (
    <div className="ph-row">
      <span className="ph-row-type">
        {hasThumb ? (
          /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
          <img className="ph-row-thumb" src={`/api/presentations/file/${file.id}?asset=thumb`} alt="" loading="lazy" decoding="async" />
        ) : (
          <PresentationTypeIcon extension={file.fileType} scale={0.56} />
        )}
      </span>

      <a className="ph-row-name" href={href} target="_blank" rel="noopener noreferrer" title={file.title}>
        {file.title}
      </a>

      <span className="ph-row-lang">
        <FlagIcon code={file.language} />
      </span>

      <span className="ph-row-size">{formatBytes(file.sizeBytes)}</span>

      <span className="ph-row-modified">
        <RelativeTime iso={file.createdAt} />
      </span>

      <span className="ph-row-actions">
        <a className="ph-dl" href={fileHref(file.id, true)} aria-label={`Download ${file.title}`} title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
        {isSuperAdmin && (
          <button type="button" className="ph-card-menu" onClick={() => onManage(file)} aria-label={`Manage ${file.title}`}>
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

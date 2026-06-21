import Link from "next/link";
import type { PresentationFolderDTO } from "@/lib/presentations";

/** Root-index folder card (flat, no 3D). Navigates into the folder's page. */
export function PresentationFolderCard({ folder }: { folder: PresentationFolderDTO }) {
  return (
    <Link href={`/presentation-hub/${folder.path}`} className="ph-folder-card">
      <span className="ph-folder-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </span>
      <span className="ph-folder-name" title={folder.name}>
        {folder.name}
      </span>
    </Link>
  );
}

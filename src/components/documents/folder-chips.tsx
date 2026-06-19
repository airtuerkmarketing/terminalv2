import Link from "next/link";
import type { FolderDTO } from "@/lib/documents";

/**
 * Child-folder chips. Single click navigates into the child's page (no
 * filter-vs-navigate ambiguity). Hidden when the folder has no children.
 * Non-public children get a subtle lock marker (admins only ever see these).
 */
export function FolderChips({ folders }: { folders: FolderDTO[] }) {
  if (folders.length === 0) return null;
  return (
    <div className="dl-chips" role="list" aria-label="Subfolders">
      {folders.map((f) => (
        <Link
          key={f.id}
          href={`/documents-library/${f.path}`}
          className="dl-chip"
          role="listitem"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <span>{f.name}</span>
          {!f.isPublic && (
            <svg className="dl-chip-lock" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} aria-label="Private">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          )}
        </Link>
      ))}
    </div>
  );
}

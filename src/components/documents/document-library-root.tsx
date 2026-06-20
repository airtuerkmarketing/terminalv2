"use client";

import { useState } from "react";
import "@/styles/document-library.css";
import type { RootFolderDTO } from "@/lib/documents";
import { CreateFolderModal } from "./create-folder-modal";
import { FolderCard3D } from "./folder-card-3d";

/** Root index: visible top-level folders as 3D animated cards, + admin "New folder". */
export function DocumentLibraryRoot({
  folders,
  isAdmin,
}: {
  folders: RootFolderDTO[];
  isAdmin: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <article className="document-library">
      <nav className="dl-breadcrumb" aria-label="Breadcrumb">
        <span className="dl-crumb current" aria-current="page">
          Documents Library
        </span>
      </nav>

      <header className="dl-head">
        <div className="dl-head-title">
          <h1>Documents Library</h1>
        </div>
        {isAdmin && (
          <button type="button" className="dl-btn primary" onClick={() => setCreateOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Folder
          </button>
        )}
      </header>

      {folders.length === 0 ? (
        <div className="dl-empty">
          <strong>No folders yet.</strong>
          {isAdmin ? <span>Create your first folder to get started.</span> : <span>Nothing here yet.</span>}
        </div>
      ) : (
        <div className="dl-folder-grid">
          {folders.map((f) => (
            <FolderCard3D
              key={f.id}
              name={f.name}
              href={`/documents-library/${f.path}`}
              isPublic={f.isPublic}
              fileCount={f.fileCount}
              previewFiles={f.previewFiles}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />
      )}
    </article>
  );
}

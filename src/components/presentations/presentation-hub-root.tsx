"use client";

import { useState } from "react";
import "@/styles/presentation-hub.css";
import type { RootPresentationFolderDTO } from "@/lib/presentations";
import { CreateFolderModal } from "./create-folder-modal";
import { PresentationFolderCard3D } from "./presentation-folder-card-3d";

/** Root index: top-level folders as 3D animated cards with file-peek + admin
 *  "New folder". (Featured hero + global search land in Stufe 6.) */
export function PresentationHubRoot({
  folders,
  isAdmin,
}: {
  folders: RootPresentationFolderDTO[];
  isAdmin: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <article className="ph-hub">
      <nav className="ph-breadcrumb" aria-label="Breadcrumb">
        <span className="ph-crumb current" aria-current="page">
          Presentation Hub
        </span>
      </nav>

      <header className="ph-head">
        <div className="ph-head-title">
          <h1>Presentation Hub</h1>
        </div>
        {isAdmin && (
          <button type="button" className="ph-btn primary" onClick={() => setCreateOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Folder
          </button>
        )}
      </header>

      {folders.length === 0 ? (
        <div className="ph-empty">
          <strong>No folders yet.</strong>
          {isAdmin ? <span>Create your first folder to get started.</span> : <span>Nothing here yet.</span>}
        </div>
      ) : (
        <div className="ph-folder-grid">
          {folders.map((f) => (
            <PresentationFolderCard3D
              key={f.id}
              name={f.name}
              href={`/presentation-hub/${f.path}`}
              fileCount={f.fileCount}
              previewFiles={f.previewFiles}
            />
          ))}
        </div>
      )}

      {isAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />}
    </article>
  );
}

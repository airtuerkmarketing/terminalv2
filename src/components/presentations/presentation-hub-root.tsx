"use client";

import { useState } from "react";
import "@/styles/presentation-hub.css";
import type { PresentationFolderDTO } from "@/lib/presentations";
import { CreateFolderModal } from "./create-folder-modal";
import { PresentationFolderCard } from "./presentation-folder-card";

/** Root index: top-level folders as flat cards + admin "New folder".
 *  (Featured hero + global search land in Stufe 6.) */
export function PresentationHubRoot({
  folders,
  isAdmin,
}: {
  folders: PresentationFolderDTO[];
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
            <PresentationFolderCard key={f.id} folder={f} />
          ))}
        </div>
      )}

      {isAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />}
    </article>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import "@/styles/document-library.css";
import type { FolderDTO } from "@/lib/documents";
import { CreateFolderModal } from "./create-folder-modal";

/** Root index: visible top-level folders as cards, + admin "New folder". */
export function DocumentLibraryRoot({
  folders,
  isAdmin,
}: {
  folders: FolderDTO[];
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
            <Link key={f.id} href={`/documents-library/${f.path}`} className="dl-folder-card">
              <span className="dl-folder-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </span>
              <span className="dl-folder-name">{f.name}</span>
              {!f.isPublic && <span className="dl-badge-private sm">Private</span>}
            </Link>
          ))}
        </div>
      )}

      {isAdmin && (
        <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />
      )}
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import "@/styles/document-library.css";
import type { FileSortKey, RootFolderDTO } from "@/lib/documents";
import type { ViewMode } from "@/components/ui/view-toggle";
import { CreateFolderModal } from "./create-folder-modal";
import { FolderCard3D, FolderRow } from "./folder-card-3d";
import { LibraryToolbar } from "./library-toolbar";

/** Root index: visible top-level folders. Uses the SAME LibraryToolbar + card/
 *  list views as a folder page (consistent look). Search/sort/view are client-
 *  only over the already-loaded folders — no new server call. */
export function DocumentLibraryRoot({
  folders,
  isSuperAdmin,
}: {
  folders: RootFolderDTO[];
  isSuperAdmin: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<FileSortKey>("name");
  const [view, setView] = useState<ViewMode>("card");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = folders.filter((f) => !q || f.name.toLowerCase().includes(q));
    // Folders only carry a name + file count, so "Size" sorts by count and
    // "Modified" has no folder timestamp → falls back to name.
    return [...list].sort((a, b) =>
      sort === "size" ? b.fileCount - a.fileCount : a.name.localeCompare(b.name)
    );
  }, [folders, search, sort]);

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
      </header>

      <LibraryToolbar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search folders…"
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        viewStorageKey="terminalv2-doclib-view"
        actionLabel={isSuperAdmin ? "New Folder" : undefined}
        onAction={isSuperAdmin ? () => setCreateOpen(true) : undefined}
      />

      {shown.length === 0 ? (
        <div className="dl-empty">
          {search ? (
            <span>No folders match “{search}”.</span>
          ) : (
            <>
              <strong>No folders yet.</strong>
              {isSuperAdmin ? <span>Create your first folder to get started.</span> : <span>Nothing here yet.</span>}
            </>
          )}
        </div>
      ) : view === "list" ? (
        <div className="dl-list">
          <div className="dl-list-head">
            <span />
            <span>Name</span>
            <span>Language</span>
            <span>Size</span>
            <span>Modified</span>
            <span />
          </div>
          {shown.map((f) => (
            <FolderRow
              key={f.id}
              id={f.id}
              name={f.name}
              href={`/documents-library/${f.path}`}
              isPublic={f.isPublic}
              fileCount={f.fileCount}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="dl-explorer-grid">
          {shown.map((f) => (
            <FolderCard3D
              key={f.id}
              id={f.id}
              name={f.name}
              href={`/documents-library/${f.path}`}
              isPublic={f.isPublic}
              fileCount={f.fileCount}
              previewFiles={f.previewFiles}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      )}

      {isSuperAdmin && (
        <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />
      )}
    </article>
  );
}

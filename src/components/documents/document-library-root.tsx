"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import "@/styles/document-library.css";
import { createFolder } from "@/app/(public)/documents-library/actions";
import type { RootFolderDTO } from "@/lib/documents";
import { canWriteFolder, type FolderViewer } from "@/lib/documents-constants";
import type { ViewMode } from "@/components/ui/view-toggle";
import { FolderCard3D, FolderRow } from "./folder-card-3d";
import { LibraryToolbar } from "./library-toolbar";
import { EmptySpaceContextMenu } from "./empty-space-context-menu";
import { DEFAULT_FILTER, type LibraryFilter } from "./filter-sort-popover";
import { nextFolderName } from "./folder-page";
import type { CtxItem } from "./file-card";

/** Root index: visible top-level folders. Uses the SAME LibraryToolbar + card/
 *  list views as a folder page (consistent look). Search/sort/view are client-
 *  only over the already-loaded folders — no new server call. The Filter/Sort
 *  popover shows sort only here (folders carry no file type / no sub-files). */
export function DocumentLibraryRoot({
  folders,
  viewer,
}: {
  folders: RootFolderDTO[];
  viewer: FolderViewer;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const [view, setView] = useState<ViewMode>("card");
  // "New folder" creates immediately then auto-renames (see folder-page).
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  async function createTopFolder() {
    setCreateError(null);
    const res = await createFolder(null, nextFolderName(folders.map((f) => f.name)));
    if (!res.ok) {
      setCreateError(res.error ?? "Couldn’t create the folder.");
      return;
    }
    setPendingRenameId(res.id ?? null);
    router.refresh();
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = folders.filter((f) => !q || f.name.toLowerCase().includes(q));
    // Folders only carry a name + file count, so "Size" sorts by count and
    // "Modified" has no folder timestamp → falls back to name. Direction applies.
    const sorted = [...list].sort((a, b) =>
      filter.sort === "size" ? a.fileCount - b.fileCount : a.name.localeCompare(b.name)
    );
    return filter.dir === "asc" ? sorted : sorted.reverse();
  }, [folders, search, filter]);

  const spaceItems: CtxItem[] = [];
  if (viewer.isWriter) {
    spaceItems.push({ kind: "item", label: "New folder", onClick: createTopFolder }, { kind: "sep" });
  }
  spaceItems.push({ kind: "item", label: "Refresh", onClick: () => router.refresh() });

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
        filter={filter}
        onFilter={setFilter}
        showFolderToggle={false}
        showTypeFilter={false}
        view={view}
        onView={setView}
        viewStorageKey="terminalv2-doclib-view"
        actionLabel={viewer.isWriter ? "New Folder" : undefined}
        actionIcon={viewer.isWriter ? <FolderPlus size={16} aria-hidden="true" /> : undefined}
        onAction={viewer.isWriter ? createTopFolder : undefined}
      />

      {createError && <p className="dl-error">{createError}</p>}

      <EmptySpaceContextMenu items={spaceItems} className="dl-space">
        {shown.length === 0 ? (
          <div className="dl-empty">
            {search ? (
              <span>No folders match “{search}”.</span>
            ) : (
              <>
                <strong>No folders yet.</strong>
                {viewer.isWriter ? (
                  <span>Create your first folder to get started.</span>
                ) : (
                  <span>Nothing here yet.</span>
                )}
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
                path={f.path}
                parentId={f.parentId}
                isPublic={f.isPublic}
                fileCount={f.fileCount}
                color={f.color}
                isSuperAdmin={canWriteFolder(f.createdBy, viewer)}
                autoRename={f.id === pendingRenameId}
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
                path={f.path}
                parentId={f.parentId}
                isPublic={f.isPublic}
                fileCount={f.fileCount}
                previewFiles={f.previewFiles}
                color={f.color}
                isSuperAdmin={canWriteFolder(f.createdBy, viewer)}
                autoRename={f.id === pendingRenameId}
              />
            ))}
          </div>
        )}
      </EmptySpaceContextMenu>
    </article>
  );
}

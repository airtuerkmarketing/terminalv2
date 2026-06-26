"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import "@/styles/document-library.css";
import { createFolder } from "@/app/(public)/presentation-hub/actions";
import type { RootPresentationFolderDTO } from "@/lib/presentations";
import type { ViewMode } from "@/components/ui/view-toggle";
import { LibraryToolbar } from "@/components/documents/library-toolbar";
import { EmptySpaceContextMenu } from "@/components/documents/empty-space-context-menu";
import { DEFAULT_FILTER, type LibraryFilter } from "@/components/documents/filter-sort-popover";
import { nextFolderName } from "@/components/documents/folder-page";
import type { CtxItem } from "@/components/documents/file-card";
import { PresentationFolderCard3D, PresentationFolderRow } from "./presentation-folder-card-3d";

/** Presentation Hub root — 1:1 with the Document Library root (D-077): same
 *  toolbar + card/list views + free-standing 3D folder cards with management. */
export function PresentationHubRoot({
  folders,
  isSuperAdmin,
}: {
  folders: RootPresentationFolderDTO[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const [view, setView] = useState<ViewMode>("card");
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
    const sorted = [...list].sort((a, b) =>
      filter.sort === "size" ? a.fileCount - b.fileCount : a.name.localeCompare(b.name)
    );
    return filter.dir === "asc" ? sorted : sorted.reverse();
  }, [folders, search, filter]);

  const spaceItems: CtxItem[] = [];
  if (isSuperAdmin) {
    spaceItems.push({ kind: "item", label: "New folder", onClick: createTopFolder }, { kind: "sep" });
  }
  spaceItems.push({ kind: "item", label: "Refresh", onClick: () => router.refresh() });

  return (
    <article className="document-library">
      <nav className="dl-breadcrumb" aria-label="Breadcrumb">
        <span className="dl-crumb current" aria-current="page">
          Presentation Hub
        </span>
      </nav>

      <header className="dl-head">
        <div className="dl-head-title">
          <h1>Presentation Hub</h1>
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
        viewStorageKey="terminalv2-phub-view"
        actionLabel={isSuperAdmin ? "New Folder" : undefined}
        actionIcon={isSuperAdmin ? <FolderPlus size={16} aria-hidden="true" /> : undefined}
        onAction={isSuperAdmin ? createTopFolder : undefined}
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
              <PresentationFolderRow
                key={f.id}
                id={f.id}
                name={f.name}
                href={`/presentation-hub/${f.path}`}
                path={f.path}
                parentId={f.parentId}
                fileCount={f.fileCount}
                color={f.color}
                isPublic={f.isPublic}
                isSuperAdmin={isSuperAdmin}
                autoRename={f.id === pendingRenameId}
              />
            ))}
          </div>
        ) : (
          <div className="dl-explorer-grid">
            {shown.map((f) => (
              <PresentationFolderCard3D
                key={f.id}
                id={f.id}
                name={f.name}
                href={`/presentation-hub/${f.path}`}
                path={f.path}
                parentId={f.parentId}
                fileCount={f.fileCount}
                previewFiles={f.previewFiles}
                color={f.color}
                isPublic={f.isPublic}
                isSuperAdmin={isSuperAdmin}
                autoRename={f.id === pendingRenameId}
              />
            ))}
          </div>
        )}
      </EmptySpaceContextMenu>
    </article>
  );
}

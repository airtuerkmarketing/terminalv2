"use client";

import { useMemo, useState } from "react";
import "@/styles/document-library.css";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { listFiles } from "@/app/(public)/documents-library/actions";
import type { FileDTO, FolderDTO } from "@/lib/documents";
import { Breadcrumb } from "./breadcrumb";
import { FolderChips } from "./folder-chips";
import { FileCard } from "./file-card";
import { FileRow } from "./file-row";
import { FileEditModal } from "./file-edit-modal";
import { UploadModal } from "./upload-modal";
import { FolderActionsMenu } from "./folder-actions-menu";

type SortKey = "name" | "date" | "size";

export function FolderPage({
  folder,
  trail,
  childFolders,
  initialFiles,
  initialHasMore,
  allFolders,
  isAdmin,
  isSuperAdmin,
}: {
  folder: FolderDTO;
  trail: FolderDTO[];
  childFolders: FolderDTO[];
  initialFiles: FileDTO[];
  initialHasMore: boolean;
  allFolders: FolderDTO[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  const [files, setFiles] = useState<FileDTO[]>(initialFiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [manageFile, setManageFile] = useState<FileDTO | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // In-place list updates so mutations reflect without an F5 (revalidatePath only
  // refreshes server-derived bits, not this client list).
  const upsertFile = (f: FileDTO) =>
    setFiles((prev) => {
      const i = prev.findIndex((x) => x.id === f.id);
      if (i === -1) return [f, ...prev]; // new upload → prepend
      const next = [...prev];
      next[i] = f; // edit / replace → swap by id
      return next;
    });
  const removeFile = (id: string) => setFiles((prev) => prev.filter((x) => x.id !== id)); // delete / move

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? files.filter((f) => f.title.toLowerCase().includes(q)) : files;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "size") return b.sizeBytes - a.sizeBytes;
      return b.createdAt.localeCompare(a.createdAt); // date, newest first
    });
    return sorted;
  }, [files, search, sort]);

  async function loadMore() {
    setLoadingMore(true);
    const res = await listFiles(folder.id, files.length);
    setFiles((prev) => [...prev, ...res.files]);
    setHasMore(res.hasMore);
    setLoadingMore(false);
  }

  const empty = files.length === 0 && childFolders.length === 0;

  return (
    <article className="document-library">
      <Breadcrumb trail={trail} />

      <header className="dl-head">
        <div className="dl-head-title">
          <h1>{folder.name}</h1>
          {!folder.isPublic && <span className="dl-badge-private">Private</span>}
        </div>
        {isAdmin && (
          <FolderActionsMenu folder={folder} isSuperAdmin={isSuperAdmin} allFolders={allFolders} />
        )}
      </header>

      <FolderChips folders={childFolders} />

      <div className="dl-toolbar">
        <div className="dl-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            aria-label="Search files in this folder"
          />
        </div>
        <div className="dl-toolbar-right">
          <select
            className="dl-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
          >
            <option value="name">Name</option>
            <option value="date">Newest</option>
            <option value="size">Size</option>
          </select>
          <ViewToggle value={view} onChange={setView} storageKey="terminalv2-doclib-view" />
          {isAdmin && (
            <button type="button" className="dl-btn primary" onClick={() => setUploadOpen(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload File
            </button>
          )}
        </div>
      </div>

      {empty ? (
        <div className="dl-empty">
          <strong>This folder is empty.</strong>
          {isAdmin ? <span>Upload a file or create a subfolder to get started.</span> : <span>No files here yet.</span>}
        </div>
      ) : shown.length === 0 ? (
        <div className="dl-empty">
          <span>No files match “{search}”.</span>
        </div>
      ) : view === "list" ? (
        <div className="dl-rows">
          {shown.map((f) => (
            <FileRow key={f.id} file={f} isAdmin={isAdmin} onManage={setManageFile} />
          ))}
        </div>
      ) : (
        <div className="dl-grid" data-view={view}>
          {shown.map((f) => (
            <FileCard key={f.id} file={f} isAdmin={isAdmin} onManage={setManageFile} />
          ))}
        </div>
      )}

      {hasMore && !search && (
        <div className="dl-loadmore">
          <button type="button" className="dl-btn ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {isAdmin && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          folderId={folder.id}
          onUploaded={upsertFile}
        />
      )}
      {isAdmin && (
        <FileEditModal
          file={manageFile}
          allFolders={allFolders}
          onClose={() => setManageFile(null)}
          onUpdated={upsertFile}
          onRemoved={removeFile}
        />
      )}
    </article>
  );
}

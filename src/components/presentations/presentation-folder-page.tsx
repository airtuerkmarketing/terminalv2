"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Upload } from "lucide-react";
import "@/styles/presentation-hub.css";
import "@/styles/document-library.css";
import type { ViewMode } from "@/components/ui/view-toggle";
import { LibraryToolbar } from "@/components/documents/library-toolbar";
import { DEFAULT_FILTER, type LibraryFilter } from "@/components/documents/filter-sort-popover";
import {
  createFolder,
  listPresentationFilesInFolder,
  renameFolder,
} from "@/app/(public)/presentation-hub/actions";
import type {
  PresentationFileDTO,
  PresentationFolderDTO,
  PresentationSortKey,
  RootPresentationFolderDTO,
} from "@/lib/presentations";
import { nextFolderName } from "@/components/documents/folder-page";
import { PresentationBreadcrumb } from "./presentation-breadcrumb";
import { PresentationCard } from "./presentation-card";
import { PresentationFileRow } from "./presentation-file-row";
import { PresentationFileManageModal } from "./presentation-file-manage-modal";
import { UploadModal } from "./upload-modal";
import { FolderActionsMenu } from "./folder-actions-menu";
import { PresentationFolderCard3D, PresentationFolderRow } from "./presentation-folder-card-3d";

const PAGE_SIZE = 60;

export function PresentationFolderPage({
  folder,
  trail,
  childFolders,
  initialFiles,
  initialHasMore,
  isSuperAdmin,
}: {
  folder: PresentationFolderDTO;
  trail: PresentationFolderDTO[];
  childFolders: RootPresentationFolderDTO[];
  initialFiles: PresentationFileDTO[];
  initialHasMore: boolean;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<PresentationFileDTO[]>(initialFiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const [manageFile, setManageFile] = useState<PresentationFileDTO | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline rename of the folder title (mirrors the doc library); redirects to the
  // new slug so the page doesn't 404 (D-077).
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(folder.name);

  const reqId = useRef(0);
  const firstRun = useRef(true);

  const fetchReplace = useCallback(
    (q: string, sortKey: PresentationSortKey) => {
      const token = ++reqId.current;
      setLoading(true);
      return listPresentationFilesInFolder(folder.id, { q, sort: sortKey, offset: 0, limit: PAGE_SIZE }).then(
        (res) => {
          if (token !== reqId.current) return;
          setFiles(res.files);
          setHasMore(res.hasMore);
          setLoading(false);
        }
      );
    },
    [folder.id]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    fetchReplace(debouncedSearch, filter.sort);
  }, [debouncedSearch, filter.sort, fetchReplace]);

  const isFiltered = debouncedSearch !== "" || filter.sort !== "name";

  const upsertFile = (f: PresentationFileDTO) => {
    if (isFiltered) {
      fetchReplace(debouncedSearch, filter.sort);
      return;
    }
    setFiles((prev) => {
      const i = prev.findIndex((x) => x.id === f.id);
      if (i === -1) return [f, ...prev];
      const next = [...prev];
      next[i] = f;
      return next;
    });
  };
  const removeFile = (id: string) => {
    if (isFiltered) {
      fetchReplace(debouncedSearch, filter.sort);
      return;
    }
    setFiles((prev) => prev.filter((x) => x.id !== id));
  };

  async function loadMore() {
    const token = ++reqId.current;
    setLoading(true);
    const res = await listPresentationFilesInFolder(folder.id, {
      q: debouncedSearch,
      sort: filter.sort,
      offset: files.length,
      limit: PAGE_SIZE,
    });
    if (token !== reqId.current) return;
    setFiles((prev) => [...prev, ...res.files]);
    setHasMore(res.hasMore);
    setLoading(false);
  }

  const startTitleRename = () => {
    setTitleDraft(folder.name);
    setEditingTitle(true);
  };
  async function commitTitle() {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (!t || t === folder.name) {
      setTitleDraft(folder.name);
      return;
    }
    const res = await renameFolder(folder.id, t);
    if (res.ok) {
      if (res.path && res.path !== folder.path) router.replace(`/presentation-hub/${res.path}`);
      else router.refresh();
    } else setTitleDraft(folder.name);
  }

  async function createSubfolder() {
    setCreateError(null);
    const res = await createFolder(folder.id, nextFolderName(childFolders.map((f) => f.name)));
    if (!res.ok) {
      setCreateError(res.error ?? "Couldn’t create the folder.");
      return;
    }
    setPendingRenameId(res.id ?? null);
    router.refresh();
  }

  // Direction is a client layer over the loaded page (matches the doc library).
  const orderedFiles = filter.dir === "asc" ? files : [...files].reverse();
  const noFiles = orderedFiles.length === 0;
  const hasSubfolders = childFolders.length > 0;

  return (
    <article className="document-library">
      <PresentationBreadcrumb trail={trail} />

      <header className="dl-head">
        <div className="dl-head-title">
          {editingTitle ? (
            <input
              className="dl-title-edit"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                else if (e.key === "Escape") {
                  setTitleDraft(folder.name);
                  setEditingTitle(false);
                }
              }}
              onBlur={commitTitle}
              aria-label="Rename folder"
            />
          ) : isSuperAdmin ? (
            <h1 className="dl-title-h1">
              <button type="button" className="dl-title-btn" onClick={startTitleRename} title="Rename folder">
                {folder.name}
                <Pencil className="dl-title-pencil" size={16} aria-hidden="true" />
              </button>
            </h1>
          ) : (
            <h1>{folder.name}</h1>
          )}
        </div>
        {isSuperAdmin && <FolderActionsMenu folder={folder} isSuperAdmin={isSuperAdmin} />}
      </header>

      <LibraryToolbar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search presentations…"
        filter={filter}
        onFilter={setFilter}
        showFolderToggle={false}
        showTypeFilter={false}
        view={view}
        onView={setView}
        viewStorageKey="terminalv2-prezhub-view"
        secondaryLabel={isSuperAdmin ? "New subfolder" : undefined}
        secondaryIcon={isSuperAdmin ? <Plus size={16} aria-hidden="true" /> : undefined}
        onSecondary={isSuperAdmin ? createSubfolder : undefined}
        actionLabel={isSuperAdmin ? "Upload" : undefined}
        actionIcon={isSuperAdmin ? <Upload size={16} aria-hidden="true" /> : undefined}
        onAction={isSuperAdmin ? () => setUploadOpen(true) : undefined}
      />

      {createError && <p className="dl-error">{createError}</p>}

      {/* Folders first (managed cards), then the presentation file area. */}
      {hasSubfolders && (
        <div className="dl-explorer-grid" style={{ marginBottom: "var(--space-5)" }}>
          {view === "list"
            ? childFolders.map((f) => (
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
              ))
            : childFolders.map((f) => (
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

      {noFiles ? (
        debouncedSearch ? (
          <div className="ph-empty">
            <span>No presentations match “{search}”.</span>
          </div>
        ) : !hasSubfolders ? (
          <div className="ph-empty">
            <strong>This folder is empty.</strong>
            {isSuperAdmin ? (
              <span>Upload a presentation or create a subfolder to get started.</span>
            ) : (
              <span>Nothing here yet.</span>
            )}
          </div>
        ) : null
      ) : view === "list" ? (
        <div className="ph-list">
          <div className="ph-list-head">
            <span />
            <span>Name</span>
            <span>Language</span>
            <span>Size</span>
            <span>Modified</span>
            <span />
          </div>
          {orderedFiles.map((f) => (
            <PresentationFileRow key={f.id} file={f} isSuperAdmin={isSuperAdmin} onManage={setManageFile} />
          ))}
        </div>
      ) : (
        <div className="ph-grid" data-view={view}>
          {orderedFiles.map((f) => (
            <PresentationCard key={f.id} file={f} view="card" isSuperAdmin={isSuperAdmin} onManage={setManageFile} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="dl-loadmore">
          <button type="button" className="dl-btn ghost" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {isSuperAdmin && (
        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} folderId={folder.id} onUploaded={upsertFile} />
      )}
      {isSuperAdmin && (
        <PresentationFileManageModal
          file={manageFile}
          onClose={() => setManageFile(null)}
          onUpdated={upsertFile}
          onRemoved={removeFile}
        />
      )}
    </article>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "@/styles/document-library.css";
import type { ViewMode } from "@/components/ui/view-toggle";
import { searchFilesInFolder } from "@/app/(public)/documents-library/actions";
import type { FileDTO, FileSortKey, FolderDTO } from "@/lib/documents";
import { Breadcrumb } from "./breadcrumb";
import { FileCard } from "./file-card";
import { FileRow } from "./file-row";
import { FileEditModal } from "./file-edit-modal";
import { UploadModal } from "./upload-modal";
import { FolderActionsMenu } from "./folder-actions-menu";
import { FolderCard3D, FolderRow } from "./folder-card-3d";
import { LibraryToolbar } from "./library-toolbar";

const PAGE_SIZE = 60;

export function FolderPage({
  folder,
  trail,
  childFolders,
  initialFiles,
  initialHasMore,
  isSuperAdmin,
}: {
  folder: FolderDTO;
  trail: FolderDTO[];
  childFolders: FolderDTO[];
  initialFiles: FileDTO[];
  initialHasMore: boolean;
  isSuperAdmin: boolean;
}) {
  const [files, setFiles] = useState<FileDTO[]>(initialFiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<FileSortKey>("name");
  const [manageFile, setManageFile] = useState<FileDTO | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Monotonic token: every fetch captures one; only the latest result is applied,
  // so out-of-order responses (fast typing, sort flip mid-load) can't clobber.
  const reqId = useRef(0);
  // The initial list (q="", sort="name") is server-rendered, so skip the first
  // run of the query effect and reuse initialFiles (no redundant round-trip).
  const firstRun = useRef(true);

  // Search + sort run DB-side now, so they cover the whole folder rather than just
  // the loaded page. Re-query page 1 and replace the list on each change.
  const fetchReplace = useCallback(
    (q: string, sortKey: FileSortKey) => {
      const token = ++reqId.current;
      setLoading(true);
      return searchFilesInFolder(folder.id, { q, sort: sortKey, offset: 0, limit: PAGE_SIZE }).then(
        (res) => {
          if (token !== reqId.current) return; // a newer query superseded this one
          setFiles(res.files);
          setHasMore(res.hasMore);
          setLoading(false);
        }
      );
    },
    [folder.id]
  );

  // Debounce the search box so each keystroke doesn't hit the DB.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Re-query whenever the (debounced) term or sort changes; skip the first run.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    fetchReplace(debouncedSearch, sort);
  }, [debouncedSearch, sort, fetchReplace]);

  const isFiltered = debouncedSearch !== "" || sort !== "name";

  // In-place list updates so mutations reflect without an F5. When a query/sort is
  // active, re-fetch the current view instead — an optimistic local edit would
  // mis-order or wrongly include/exclude a row under the active query.
  const upsertFile = (f: FileDTO) => {
    if (isFiltered) {
      fetchReplace(debouncedSearch, sort);
      return;
    }
    setFiles((prev) => {
      const i = prev.findIndex((x) => x.id === f.id);
      if (i === -1) return [f, ...prev]; // new upload → prepend
      const next = [...prev];
      next[i] = f; // edit / replace → swap by id
      return next;
    });
  };
  const removeFile = (id: string) => {
    if (isFiltered) {
      fetchReplace(debouncedSearch, sort);
      return;
    }
    setFiles((prev) => prev.filter((x) => x.id !== id)); // delete / move
  };

  async function loadMore() {
    const token = ++reqId.current;
    setLoading(true);
    const res = await searchFilesInFolder(folder.id, {
      q: debouncedSearch,
      sort,
      offset: files.length,
      limit: PAGE_SIZE,
    });
    if (token !== reqId.current) return; // a newer query superseded this load-more
    setFiles((prev) => [...prev, ...res.files]);
    setHasMore(res.hasMore);
    setLoading(false);
  }

  const noFiles = files.length === 0;

  // List-view column header: a sort button (active column gets a chevron).
  const SortTh = ({ label, sortKey }: { label: string; sortKey: FileSortKey }) => (
    <button
      type="button"
      className={`dl-sort-th${sort === sortKey ? " active" : ""}`}
      aria-pressed={sort === sortKey}
      onClick={() => setSort(sortKey)}
    >
      {label}
      {sort === sortKey && <ChevronDown size={14} aria-hidden="true" />}
    </button>
  );

  const hasFolders = childFolders.length > 0;

  // Folder cells (Windows-Explorer style): free-standing 3D folder cards. They
  // share the SAME grid + cell size as the file cells in card view (folders
  // first). childFolders is a plain FolderDTO (no fileCount/previewFiles), so the
  // cards show 0 files / no peek for now (reported). isSuperAdmin enables the
  // folder context-menu actions.
  const folderCards = childFolders.map((f) => (
    <FolderCard3D
      key={f.id}
      id={f.id}
      name={f.name}
      href={`/documents-library/${f.path}`}
      isPublic={f.isPublic}
      fileCount={0}
      previewFiles={[]}
      isSuperAdmin={isSuperAdmin}
    />
  ));

  // Right-hand (or full-width) area: folders + files + load-more. Two views:
  // card → folders + files in one free-standing explorer grid (folders first);
  // list → folder rows then file rows in one .dl-list. (Grid view removed.)
  const filesArea = (
    <>
      {noFiles && !hasFolders ? (
        debouncedSearch ? (
          <div className="dl-empty">
            <span>No files match “{search}”.</span>
          </div>
        ) : (
          <div className="dl-empty">
            <strong>This folder is empty.</strong>
            {isSuperAdmin ? (
              <span>Upload a file, or open a subfolder from the left sidebar.</span>
            ) : (
              <span>No files here yet.</span>
            )}
          </div>
        )
      ) : view === "list" ? (
        <div className="dl-list">
          <div className="dl-list-head">
            <span />
            <SortTh label="Name" sortKey="name" />
            <span>Language</span>
            <SortTh label="Size" sortKey="size" />
            <SortTh label="Modified" sortKey="date" />
            <span />
          </div>
          {childFolders.map((f) => (
            <FolderRow
              key={f.id}
              id={f.id}
              name={f.name}
              href={`/documents-library/${f.path}`}
              isPublic={f.isPublic}
              fileCount={0}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
          {files.map((f) => (
            <FileRow key={f.id} file={f} isSuperAdmin={isSuperAdmin} onManage={setManageFile} />
          ))}
        </div>
      ) : (
        <div className="dl-explorer-grid">
          {folderCards}
          {files.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              view="card"
              isSuperAdmin={isSuperAdmin}
              onManage={setManageFile}
              onUpdated={upsertFile}
              onRemoved={removeFile}
            />
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
    </>
  );

  // Subfolder navigation now lives in the DocumentsSidebar (left), so the main
  // panel shows only the file area — no second "FOLDERS" list here.
  return (
    <article className="document-library">
      <Breadcrumb trail={trail} />

      <header className="dl-head">
        <div className="dl-head-title">
          <h1>{folder.name}</h1>
          {!folder.isPublic && <span className="dl-badge-private">Private</span>}
        </div>
        {isSuperAdmin && (
          <FolderActionsMenu folder={folder} isSuperAdmin={isSuperAdmin} />
        )}
      </header>

      <LibraryToolbar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search files…"
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        viewStorageKey="terminalv2-doclib-view"
        actionLabel={isSuperAdmin ? "Upload File" : undefined}
        onAction={isSuperAdmin ? () => setUploadOpen(true) : undefined}
      />

      {/* File area (subfolder nav moved to the DocumentsSidebar). */}
      {filesArea}

      {isSuperAdmin && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          folderId={folder.id}
          onUploaded={upsertFile}
        />
      )}
      {isSuperAdmin && (
        <FileEditModal
          file={manageFile}
          onClose={() => setManageFile(null)}
          onUpdated={upsertFile}
          onRemoved={removeFile}
        />
      )}
    </article>
  );
}

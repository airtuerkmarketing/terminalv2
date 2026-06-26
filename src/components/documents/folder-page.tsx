"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Lock, Pencil, Plus, Upload } from "lucide-react";
import "@/styles/document-library.css";
import type { ViewMode } from "@/components/ui/view-toggle";
import { createFolder, renameFolder, searchFilesInFolder } from "@/app/(public)/documents-library/actions";
import type { FileDTO, FileSortKey, FolderDTO, RootFolderDTO } from "@/lib/documents";
import { fileKind } from "@/lib/documents-constants";
import { Breadcrumb } from "./breadcrumb";
import { FileCard, type CtxItem } from "./file-card";
import { FileRow } from "./file-row";
import { FileEditModal } from "./file-edit-modal";
import { UploadModal } from "./upload-modal";
import { FolderActionsMenu } from "./folder-actions-menu";
import { FolderCard3D, FolderRow } from "./folder-card-3d";
import { LibraryToolbar } from "./library-toolbar";
import { EmptySpaceContextMenu } from "./empty-space-context-menu";
import { VisibilityPopover } from "./visibility-popover";
import { DEFAULT_FILTER, type LibraryFilter } from "./filter-sort-popover";

const PAGE_SIZE = 60;

// Client-side comparator (used for the type-filter + direction layer that runs
// over the already-loaded list). ISO timestamps sort lexically.
function compareFiles(a: FileDTO, b: FileDTO, key: FileSortKey): number {
  if (key === "size") return a.sizeBytes - b.sizeBytes;
  if (key === "date") return a.createdAt.localeCompare(b.createdAt);
  return a.title.localeCompare(b.title);
}

// Smallest free "New Folder" / "New Folder 2" / … not already in the list.
export function nextFolderName(names: string[]): string {
  const base = "New Folder";
  const taken = new Set(names);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

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
  childFolders: RootFolderDTO[];
  initialFiles: FileDTO[];
  initialHasMore: boolean;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileDTO[]>(initialFiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const [manageFile, setManageFile] = useState<FileDTO | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  // "New folder" creates immediately, then auto-renames: the just-created id is
  // stashed here and passed down so its card/row mounts in inline-rename mode.
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline rename of the folder title (mirrors the card/row inline-rename).
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(folder.name);

  // Monotonic token: every fetch captures one; only the latest result is applied,
  // so out-of-order responses (fast typing, sort flip mid-load) can't clobber.
  const reqId = useRef(0);
  // The initial list (q="", sort="name") is server-rendered, so skip the first
  // run of the query effect and reuse initialFiles (no redundant round-trip).
  const firstRun = useRef(true);

  // Search + sort KEY run DB-side so they cover the whole folder, not just the
  // loaded page. Re-query page 1 and replace the list on each change. (Direction +
  // type filter are a client layer applied below — no server call.)
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

  // Re-query whenever the (debounced) term or sort KEY changes; skip the first run.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    fetchReplace(debouncedSearch, filter.sort);
  }, [debouncedSearch, filter.sort, fetchReplace]);

  const isFiltered = debouncedSearch !== "" || filter.sort !== "name";

  // In-place list updates so mutations reflect without an F5. When a query/sort is
  // active, re-fetch the current view instead — an optimistic local edit would
  // mis-order or wrongly include/exclude a row under the active query.
  const upsertFile = (f: FileDTO) => {
    if (isFiltered) {
      fetchReplace(debouncedSearch, filter.sort);
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
      fetchReplace(debouncedSearch, filter.sort);
      return;
    }
    setFiles((prev) => prev.filter((x) => x.id !== id)); // delete / move
  };

  async function loadMore() {
    const token = ++reqId.current;
    setLoading(true);
    const res = await searchFilesInFolder(folder.id, {
      q: debouncedSearch,
      sort: filter.sort,
      offset: files.length,
      limit: PAGE_SIZE,
    });
    if (token !== reqId.current) return; // a newer query superseded this load-more
    setFiles((prev) => [...prev, ...res.files]);
    setHasMore(res.hasMore);
    setLoading(false);
  }

  // ── Title inline-rename ───────────────────────────────────────────────────
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
      // Slug changed → this page's URL is now stale; navigate to the new path so
      // we don't 404 (otherwise router.refresh re-requests the old, gone slug).
      if (res.path && res.path !== folder.path) router.replace(`/documents-library/${res.path}`);
      else router.refresh();
    } else setTitleDraft(folder.name);
  }

  // New folder: create immediately with a default name, then drop the new folder
  // straight into inline-rename (no modal). 2 roundtrips (create + rename) by design.
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

  // ── Client filter/sort layer (type + direction) over the loaded list ───────
  const typeFiltered =
    filter.kinds.length === 0 ? files : files.filter((f) => filter.kinds.includes(fileKind(f.extension)));
  const orderedFiles = [...typeFiltered].sort((a, b) => {
    const c = compareFiles(a, b, filter.sort);
    return filter.dir === "asc" ? c : -c;
  });
  const visibleFiles = filter.show === "folders" ? [] : orderedFiles;
  const visibleFolders = filter.show === "files" ? [] : childFolders;

  const noFiles = visibleFiles.length === 0;
  const hasFolders = visibleFolders.length > 0;

  // List-view column header: sets the sort key, or flips direction if already the
  // active column. The chevron shows the current direction.
  const SortTh = ({ label, sortKey }: { label: string; sortKey: FileSortKey }) => {
    const activeKey = filter.sort === sortKey;
    return (
      <button
        type="button"
        className={`dl-sort-th${activeKey ? " active" : ""}`}
        aria-pressed={activeKey}
        onClick={() =>
          setFilter((f) =>
            activeKey ? { ...f, dir: f.dir === "asc" ? "desc" : "asc" } : { ...f, sort: sortKey }
          )
        }
      >
        {label}
        {activeKey &&
          (filter.dir === "asc" ? (
            <ChevronUp size={14} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} aria-hidden="true" />
          ))}
      </button>
    );
  };

  // Empty-space (right-click) menu items, in the current-folder context.
  const spaceItems: CtxItem[] = [];
  if (isSuperAdmin) {
    spaceItems.push(
      { kind: "item", label: "New subfolder", onClick: createSubfolder },
      { kind: "item", label: "Upload file", onClick: () => setUploadOpen(true) },
      { kind: "sep" }
    );
  }
  spaceItems.push({ kind: "item", label: "Refresh", onClick: () => router.refresh() });

  // Folder cells (Windows-Explorer style): free-standing 3D folder cards. They
  // share the SAME grid + cell size as the file cells in card view (folders
  // first). childFolders now carries real fileCount/previewFiles/color (D-074),
  // so subfolder cards show their count + docs peek like the root grid.
  // isSuperAdmin enables the folder context-menu actions.
  const folderCards = visibleFolders.map((f) => (
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
      isSuperAdmin={isSuperAdmin}
      autoRename={f.id === pendingRenameId}
    />
  ));

  // Right-hand (or full-width) area: folders + files + load-more. Two views:
  // card → folders + files in one free-standing explorer grid (folders first);
  // list → folder rows then file rows in one .dl-list. (Grid view removed.)
  const filesArea = (
    <>
      {noFiles && !hasFolders ? (
        debouncedSearch || filter.kinds.length > 0 ? (
          <div className="dl-empty">
            <span>No items match the current filter.</span>
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
          {visibleFolders.map((f) => (
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
              isSuperAdmin={isSuperAdmin}
              autoRename={f.id === pendingRenameId}
            />
          ))}
          {visibleFiles.map((f) => (
            <FileRow key={f.id} file={f} isSuperAdmin={isSuperAdmin} onManage={setManageFile} />
          ))}
        </div>
      ) : (
        <div className="dl-explorer-grid">
          {folderCards}
          {visibleFiles.map((f) => (
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

          {isSuperAdmin ? (
            <VisibilityPopover folderId={folder.id} isPublic={folder.isPublic} />
          ) : (
            !folder.isPublic && (
              <span className="dl-status-pill is-private is-static">
                <Lock size={13} aria-hidden="true" />
                Private
              </span>
            )
          )}
        </div>
        {isSuperAdmin && <FolderActionsMenu folder={folder} isSuperAdmin={isSuperAdmin} />}
      </header>

      <LibraryToolbar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search files…"
        filter={filter}
        onFilter={setFilter}
        view={view}
        onView={setView}
        viewStorageKey="terminalv2-doclib-view"
        secondaryLabel={isSuperAdmin ? "New subfolder" : undefined}
        secondaryIcon={isSuperAdmin ? <Plus size={16} aria-hidden="true" /> : undefined}
        onSecondary={isSuperAdmin ? createSubfolder : undefined}
        actionLabel={isSuperAdmin ? "Upload File" : undefined}
        actionIcon={isSuperAdmin ? <Upload size={16} aria-hidden="true" /> : undefined}
        onAction={isSuperAdmin ? () => setUploadOpen(true) : undefined}
      />

      {createError && <p className="dl-error">{createError}</p>}

      {/* Right-click anywhere in this area (not on a file/folder) → space menu. */}
      <EmptySpaceContextMenu items={spaceItems} className="dl-space">
        {filesArea}
      </EmptySpaceContextMenu>

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

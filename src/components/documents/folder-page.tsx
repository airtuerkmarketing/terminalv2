"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "@/styles/document-library.css";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import TreeNodeTooltip, { type TreeNode } from "@/components/ui/tree-node-tooltip";
import { searchFilesInFolder } from "@/app/(public)/documents-library/actions";
import type { FileDTO, FileSortKey, FolderDTO } from "@/lib/documents";
import { Breadcrumb } from "./breadcrumb";
import { FileCard } from "./file-card";
import { FileRow } from "./file-row";
import { FileEditModal } from "./file-edit-modal";
import { UploadModal } from "./upload-modal";
import { FolderActionsMenu } from "./folder-actions-menu";

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
  const hasSubfolders = childFolders.length > 0;

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

  // Right-hand (or full-width) area: files list/grid + load-more.
  const filesArea = (
    <>
      {noFiles ? (
        debouncedSearch ? (
          <div className="dl-empty">
            <span>No files match “{search}”.</span>
          </div>
        ) : !hasSubfolders ? (
          <div className="dl-empty">
            <strong>This folder is empty.</strong>
            {isSuperAdmin ? (
              <span>Upload a file or create a subfolder to get started.</span>
            ) : (
              <span>No files here yet.</span>
            )}
          </div>
        ) : (
          <div className="dl-empty">
            <span>No files in this folder — open a subfolder on the left.</span>
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
          {files.map((f) => (
            <FileRow key={f.id} file={f} isSuperAdmin={isSuperAdmin} onManage={setManageFile} />
          ))}
        </div>
      ) : (
        <div className="dl-grid" data-view={view}>
          {files.map((f) => (
            <FileCard key={f.id} file={f} isSuperAdmin={isSuperAdmin} onManage={setManageFile} />
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

  // Subfolder tree (left nav). Direct children only → flat node list, one
  // TreeNodeTooltip per child (mirrors the component's demo usage).
  const treePanel = (
    <aside className="dl-tree-panel" aria-label="Subfolders">
      <div className="dl-tree-head">Folders</div>
      {childFolders.map((f) => {
        const node: TreeNode = {
          id: f.id,
          name: f.name,
          tooltip: f.name,
          type: "folder",
          href: `/documents-library/${f.path}`,
        };
        return <TreeNodeTooltip key={f.id} node={node} />;
      })}
    </aside>
  );

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
            onChange={(e) => setSort(e.target.value as FileSortKey)}
            aria-label="Sort by"
          >
            <option value="name">Name</option>
            <option value="date">Newest</option>
            <option value="size">Size</option>
          </select>
          <ViewToggle value={view} onChange={setView} storageKey="terminalv2-doclib-view" />
          {isSuperAdmin && (
            <button type="button" className="dl-btn primary" onClick={() => setUploadOpen(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload File
            </button>
          )}
        </div>
      </div>

      {/* Below the search bar: split into a subfolder tree (≈15%) + the file
          area (rest) when this folder has subfolders; otherwise full width. */}
      {hasSubfolders ? (
        <div className="dl-split">
          {treePanel}
          <div className="dl-split-main">{filesArea}</div>
        </div>
      ) : (
        filesArea
      )}

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

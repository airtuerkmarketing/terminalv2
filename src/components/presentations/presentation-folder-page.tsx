"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/styles/presentation-hub.css";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { listPresentationFilesInFolder } from "@/app/(public)/presentation-hub/actions";
import type { PresentationFileDTO, PresentationFolderDTO, PresentationSortKey } from "@/lib/presentations";
import { PresentationBreadcrumb } from "./presentation-breadcrumb";
import { PresentationCard } from "./presentation-card";
import { PresentationFileRow } from "./presentation-file-row";
import { PresentationFileManageModal } from "./presentation-file-manage-modal";
import { UploadModal } from "./upload-modal";
import { FolderActionsMenu } from "./folder-actions-menu";

const PAGE_SIZE = 60;

export function PresentationFolderPage({
  folder,
  trail,
  childFolders,
  initialFiles,
  initialHasMore,
  isAdmin,
  isSuperAdmin,
}: {
  folder: PresentationFolderDTO;
  trail: PresentationFolderDTO[];
  childFolders: PresentationFolderDTO[];
  initialFiles: PresentationFileDTO[];
  initialHasMore: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  const [files, setFiles] = useState<PresentationFileDTO[]>(initialFiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<PresentationSortKey>("name");
  const [manageFile, setManageFile] = useState<PresentationFileDTO | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

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
    fetchReplace(debouncedSearch, sort);
  }, [debouncedSearch, sort, fetchReplace]);

  const isFiltered = debouncedSearch !== "" || sort !== "name";

  const upsertFile = (f: PresentationFileDTO) => {
    if (isFiltered) {
      fetchReplace(debouncedSearch, sort);
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
      fetchReplace(debouncedSearch, sort);
      return;
    }
    setFiles((prev) => prev.filter((x) => x.id !== id));
  };

  async function loadMore() {
    const token = ++reqId.current;
    setLoading(true);
    const res = await listPresentationFilesInFolder(folder.id, {
      q: debouncedSearch,
      sort,
      offset: files.length,
      limit: PAGE_SIZE,
    });
    if (token !== reqId.current) return;
    setFiles((prev) => [...prev, ...res.files]);
    setHasMore(res.hasMore);
    setLoading(false);
  }

  const noFiles = files.length === 0;

  return (
    <article className="ph-hub">
      <PresentationBreadcrumb trail={trail} />

      <header className="ph-head">
        <div className="ph-head-title">
          <h1>{folder.name}</h1>
        </div>
        {isAdmin && <FolderActionsMenu folder={folder} isSuperAdmin={isSuperAdmin} />}
      </header>

      {childFolders.length > 0 && (
        <div className="ph-chips" role="list" aria-label="Subfolders">
          {childFolders.map((f) => (
            <Link key={f.id} href={`/presentation-hub/${f.path}`} className="ph-chip" role="listitem">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>{f.name}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="ph-toolbar">
        <div className="ph-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presentations…"
            aria-label="Search presentations in this folder"
          />
        </div>
        <div className="ph-toolbar-right">
          <select
            className="ph-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as PresentationSortKey)}
            aria-label="Sort by"
          >
            <option value="name">Name</option>
            <option value="date">Newest</option>
            <option value="size">Size</option>
          </select>
          <ViewToggle value={view} onChange={setView} storageKey="terminalv2-prezhub-view" />
          {isAdmin && (
            <button type="button" className="ph-btn primary" onClick={() => setUploadOpen(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload
            </button>
          )}
        </div>
      </div>

      {noFiles ? (
        debouncedSearch ? (
          <div className="ph-empty">
            <span>No presentations match “{search}”.</span>
          </div>
        ) : childFolders.length === 0 ? (
          <div className="ph-empty">
            <strong>This folder is empty.</strong>
            {isAdmin ? (
              <span>Upload a presentation or create a subfolder to get started.</span>
            ) : (
              <span>Nothing here yet.</span>
            )}
          </div>
        ) : null
      ) : view === "list" ? (
        <div className="ph-list">
          <div className="ph-list-head" aria-hidden="true">
            <span />
            <span>Name</span>
            <span>Language</span>
            <span>Size</span>
            <span>Modified</span>
            <span />
          </div>
          {files.map((f) => (
            <PresentationFileRow key={f.id} file={f} isAdmin={isAdmin} onManage={setManageFile} />
          ))}
        </div>
      ) : (
        <div className="ph-grid" data-view={view}>
          {files.map((f) => (
            <PresentationCard key={f.id} file={f} isAdmin={isAdmin} onManage={setManageFile} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="ph-loadmore">
          <button type="button" className="ph-btn ghost" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {isAdmin && (
        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} folderId={folder.id} onUploaded={upsertFile} />
      )}
      {isAdmin && (
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

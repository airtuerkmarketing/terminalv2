"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Folder, FolderOpen, PanelLeft, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileKind, type FileKind } from "@/lib/documents-constants";
import { CreateFolderModal } from "./create-folder-modal";

/**
 * Documents-Library-local secondary sidebar (NOT the global app sidebar in
 * shell/sidebar.tsx). A reusable pattern: title + add/collapse, a full-width
 * borderless search, a flat folder tree (top-level only — the data layer doesn't
 * expose nested children, see getRootFolders), and the open folder's files
 * listed beneath it. Collapse state is LOCAL (useState) — independent of the
 * global data-sidebar attribute. Built with clear props so Assets can adopt it
 * later (title / folders / activePath / openFolderFiles / isSuperAdmin).
 */

export interface DocSidebarFolder {
  id: string;
  name: string;
  path: string;
  fileCount?: number; // top-level folders carry a count; subfolders don't
  isPublic: boolean;
}
export interface DocSidebarFile {
  id: string;
  title: string;
  extension: string;
}
export interface DocumentsSidebarProps {
  title?: string;
  folders: DocSidebarFolder[];
  activePath: string | null; // current folder path ("" / null at root)
  subFolders?: DocSidebarFolder[]; // child folders of the active folder
  openFolderFiles?: DocSidebarFile[]; // files of the active folder, shown under it
  isSuperAdmin: boolean;
}

// Self-drawn format badges (label + colour) — never app/brand logos.
const BADGE: Record<FileKind, { label: string; color: string }> = {
  pdf:   { label: "PDF", color: "#D8352A" },
  word:  { label: "DOC", color: "#185FA5" },
  excel: { label: "XLS", color: "#3B6D11" },
  ppt:   { label: "PPT", color: "#BA7517" },
  image: { label: "IMG", color: "#7C3AED" },
  txt:   { label: "TXT", color: "#6B7280" },
  zip:   { label: "ZIP", color: "#6B7280" },
  file:  { label: "FILE", color: "#6B7280" },
};

export function DocumentsSidebar({
  title = "Documents Library",
  folders,
  activePath,
  subFolders = [],
  openFolderFiles = [],
  isSuperAdmin,
}: DocumentsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const expandAnd = (after?: () => void) => {
    setCollapsed(false);
    if (after) window.requestAnimationFrame(after);
  };

  const query = q.trim().toLowerCase();
  const folderMatches = (f: DocSidebarFolder) =>
    !query || f.name.toLowerCase().includes(query) || f.path === activePath;
  const visible = folders.filter(folderMatches);
  const subs = query ? subFolders.filter((f) => f.name.toLowerCase().includes(query)) : subFolders;
  const files = query
    ? openFolderFiles.filter((f) => f.title.toLowerCase().includes(query))
    : openFolderFiles;

  if (collapsed) {
    return (
      <aside className="dl-sidebar is-collapsed" aria-label={title}>
        <div className="dl-rail">
          <button type="button" className="dl-rail-btn" aria-label="Sidebar ausklappen" title="Ausklappen" onClick={() => expandAnd()}>
            <PanelLeft aria-hidden />
          </button>
          {isSuperAdmin && (
            <button type="button" className="dl-rail-btn" aria-label="Ordner hinzufügen" title="Hinzufügen" onClick={() => expandAnd(() => setCreateOpen(true))}>
              <Plus aria-hidden />
            </button>
          )}
          <button type="button" className="dl-rail-btn" aria-label="Suchen" title="Suchen" onClick={() => expandAnd(() => searchRef.current?.focus())}>
            <Search aria-hidden />
          </button>
        </div>
        {isSuperAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />}
      </aside>
    );
  }

  return (
    <aside className="dl-sidebar" aria-label={title}>
      <div className="dl-sidebar-head">
        <span className="dl-sidebar-title">{title}</span>
        <div className="dl-sidebar-head-actions">
          {isSuperAdmin && (
            <button type="button" className="dl-ico-btn" aria-label="Ordner hinzufügen" title="Hinzufügen" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
            </button>
          )}
          {/* Same icon (PanelLeft) + behaviour as the global sidebar's collapse-btn. */}
          <button type="button" className="dl-ico-btn dl-collapse-btn" aria-label="Sidebar einklappen" title="Einklappen" onClick={() => setCollapsed(true)}>
            <PanelLeft aria-hidden />
          </button>
        </div>
      </div>

      {/* Full-width, radius-less search: hairline top + bottom only. */}
      <div className="dl-sidebar-search">
        <Search className="dl-sidebar-search-icon" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          aria-label="Ordner und Dateien durchsuchen"
        />
      </div>

      <nav className="dl-sidebar-tree" aria-label="Ordner">
        {visible.map((f) => {
          const isAncestor = activePath === f.path || (!!activePath && activePath.startsWith(`${f.path}/`));
          const isOpen = activePath === f.path; // exact top-level folder open
          return (
            <div key={f.id} className="dl-tree-group">
              <Link href={`/documents-library/${f.path}`} className={cn("dl-tree-item", isAncestor && "is-active")}>
                <span className="dl-tree-icon">{isOpen ? <FolderOpen aria-hidden /> : <Folder aria-hidden />}</span>
                <span className="dl-tree-name">{f.name}</span>
                {typeof f.fileCount === "number" && <span className="dl-tree-count">{f.fileCount}</span>}
              </Link>
              {isOpen && (subs.length > 0 || files.length > 0) && (
                <ul className="dl-tree-files">
                  {/* Subfolders first (navigate deeper), then files. */}
                  {subs.map((sf) => (
                    <li key={sf.id}>
                      <Link className="dl-tree-subfolder" href={`/documents-library/${sf.path}`}>
                        <span className="dl-tree-icon"><Folder aria-hidden /></span>
                        <span className="dl-file-name">{sf.name}</span>
                      </Link>
                    </li>
                  ))}
                  {files.map((file) => {
                    const b = BADGE[fileKind(file.extension)];
                    return (
                      <li key={file.id}>
                        <a className="dl-tree-file" href={`/api/library/file/${file.id}`}>
                          <span className="dl-file-badge" style={{ background: b.color }}>{b.label}</span>
                          <span className="dl-file-name">{file.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {isSuperAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />}
    </aside>
  );
}

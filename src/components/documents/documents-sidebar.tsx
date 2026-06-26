"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Folder, FolderOpen, PanelLeft, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileKind, type FileKind } from "@/lib/documents-constants";
import type { DocFolderTreeNode } from "@/lib/documents";
import { CreateFolderModal } from "./create-folder-modal";

/**
 * Documents-Library-local secondary sidebar (NOT the global app sidebar in
 * shell/sidebar.tsx). A reusable pattern: title + add/collapse, a full-width
 * borderless search, and a folder TREE expanded along the open path (D-074) —
 * every ancestor of the current folder is unfolded with its sibling folders
 * visible at each level, so the sidebar mirrors the breadcrumb main→sub→sub
 * sequence at any depth. The open folder's files list beneath it. Collapse state
 * is LOCAL (useState) — independent of the global data-sidebar attribute. Built
 * with clear props so Assets/Presentations can adopt it later.
 */

export interface DocSidebarFile {
  id: string;
  title: string;
  extension: string;
}
export interface DocumentsSidebarProps {
  title?: string;
  /** Folder tree, expanded along the open path (see getFolderTreeForPath). */
  tree: DocFolderTreeNode[];
  activePath: string | null; // current folder path ("" / null at root)
  openFolderFiles?: DocSidebarFile[]; // files of the active folder, shown under it
  isAdmin?: boolean; // gates the Trash footer (admins can manage trash)
  isSuperAdmin: boolean;
  activeView?: "trash"; // highlight the Trash entry when on the trash route
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

/** Recursive name filter: keep a node if it (or a loaded descendant) matches, or
 *  it's on the open path (so the current location stays visible while searching). */
function filterTree(nodes: DocFolderTreeNode[], q: string, onPath: (p: string) => boolean): DocFolderTreeNode[] {
  if (!q) return nodes;
  const out: DocFolderTreeNode[] = [];
  for (const n of nodes) {
    const keptKids = filterTree(n.children, q, onPath);
    const selfMatch = n.name.toLowerCase().includes(q);
    if (selfMatch || keptKids.length > 0 || onPath(n.path)) {
      out.push({ ...n, children: selfMatch ? n.children : keptKids });
    }
  }
  return out;
}

export function DocumentsSidebar({
  title = "Documents Library",
  tree,
  activePath,
  openFolderFiles = [],
  isAdmin = false,
  isSuperAdmin,
  activeView,
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
  // A folder is "open" (unfolded, folder-open icon) when it's the active folder
  // or one of its ancestors — same predicate the data layer expanded the tree by.
  const onPath = (p: string) => !!activePath && (activePath === p || activePath.startsWith(`${p}/`));
  const visibleTree = filterTree(tree, query, onPath);
  const files = query
    ? openFolderFiles.filter((f) => f.title.toLowerCase().includes(query))
    : openFolderFiles;

  function renderNode(node: DocFolderTreeNode) {
    const open = onPath(node.path);
    const isCurrent = node.path === activePath;
    return (
      <div key={node.id} className="dl-tree-group">
        <Link
          href={`/documents-library/${node.path}`}
          className={cn("dl-tree-item", open && "is-active", isCurrent && "is-current")}
          aria-current={isCurrent ? "page" : undefined}
        >
          <span className="dl-tree-icon">{open ? <FolderOpen aria-hidden /> : <Folder aria-hidden />}</span>
          <span className="dl-tree-name">{node.name}</span>
          {node.fileCount > 0 && <span className="dl-tree-count">{node.fileCount}</span>}
        </Link>
        {open && (node.children.length > 0 || (isCurrent && files.length > 0)) && (
          <div className="dl-tree-children">
            {node.children.map(renderNode)}
            {isCurrent && files.length > 0 && (
              <ul className="dl-tree-files">
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
        )}
      </div>
    );
  }

  if (collapsed) {
    return (
      <aside className="dl-sidebar is-collapsed" aria-label={title}>
        <div className="dl-rail">
          <button type="button" className="dl-rail-btn" aria-label="Expand sidebar" title="Expand" onClick={() => expandAnd()}>
            <PanelLeft aria-hidden />
          </button>
          {isSuperAdmin && (
            <button type="button" className="dl-rail-btn" aria-label="Add folder" title="Add" onClick={() => expandAnd(() => setCreateOpen(true))}>
              <Plus aria-hidden />
            </button>
          )}
          <button type="button" className="dl-rail-btn" aria-label="Search" title="Search" onClick={() => expandAnd(() => searchRef.current?.focus())}>
            <Search aria-hidden />
          </button>
          {isAdmin && (
            <Link
              href="/documents-library/trash"
              className={cn("dl-rail-btn dl-rail-foot", activeView === "trash" && "is-active")}
              aria-label="Trash"
              title="Trash"
            >
              <Trash2 aria-hidden />
            </Link>
          )}
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
            <button type="button" className="dl-ico-btn" aria-label="Add folder" title="Add" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
            </button>
          )}
          {/* Same icon (PanelLeft) + behaviour as the global sidebar's collapse-btn. */}
          <button type="button" className="dl-ico-btn dl-collapse-btn" aria-label="Collapse sidebar" title="Collapse" onClick={() => setCollapsed(true)}>
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
          aria-label="Search folders and files"
        />
      </div>

      <nav className="dl-sidebar-tree" aria-label="Folders">
        {visibleTree.map(renderNode)}
      </nav>

      {/* Trash pinned at the bottom (admins) — soft-deleted files, 30-day hold. */}
      {isAdmin && (
        <div className="dl-sidebar-foot">
          <Link
            href="/documents-library/trash"
            className={cn("dl-tree-item dl-trash-link", activeView === "trash" && "is-active is-current")}
            aria-current={activeView === "trash" ? "page" : undefined}
          >
            <span className="dl-tree-icon"><Trash2 aria-hidden /></span>
            <span className="dl-tree-name">Trash</span>
          </Link>
        </div>
      )}

      {isSuperAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={null} />}
    </aside>
  );
}

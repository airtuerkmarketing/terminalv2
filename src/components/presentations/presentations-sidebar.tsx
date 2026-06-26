"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Folder, FolderOpen, PanelLeft, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresentationFolderTreeNode } from "@/lib/presentations";
import { CreateFolderModal } from "./create-folder-modal";

/**
 * Presentation-Hub-local secondary sidebar — 1:1 with the Document Library's
 * (D-077): folder TREE expanded along the open path (siblings at every level),
 * the open folder's files beneath it, and Trash pinned at the bottom. Reuses the
 * shared `.dl-*` styling (document-library.css, imported by the page).
 */
export interface PresentationSidebarFile {
  id: string;
  title: string;
  fileType: string;
}
export interface PresentationsSidebarProps {
  title?: string;
  tree: PresentationFolderTreeNode[];
  activePath: string | null;
  openFolderFiles?: PresentationSidebarFile[];
  isAdmin?: boolean;
  isSuperAdmin: boolean;
  activeView?: "trash";
}

function fileBadge(fileType: string): { label: string; color: string } {
  const t = fileType.toLowerCase();
  if (t === "pdf") return { label: "PDF", color: "#D8352A" };
  if (t === "ppt" || t === "pptx" || t === "pps" || t === "ppsx") return { label: "PPT", color: "#BA7517" };
  if (t === "jpg" || t === "jpeg" || t === "png" || t === "webp") return { label: "IMG", color: "#7C3AED" };
  return { label: (t || "FILE").toUpperCase().slice(0, 4), color: "#6B7280" };
}

function filterTree(
  nodes: PresentationFolderTreeNode[],
  q: string,
  onPath: (p: string) => boolean
): PresentationFolderTreeNode[] {
  if (!q) return nodes;
  const out: PresentationFolderTreeNode[] = [];
  for (const n of nodes) {
    const keptKids = filterTree(n.children, q, onPath);
    const selfMatch = n.name.toLowerCase().includes(q);
    if (selfMatch || keptKids.length > 0 || onPath(n.path)) {
      out.push({ ...n, children: selfMatch ? n.children : keptKids });
    }
  }
  return out;
}

export function PresentationsSidebar({
  title = "Presentation Hub",
  tree,
  activePath,
  openFolderFiles = [],
  isAdmin = false,
  isSuperAdmin,
  activeView,
}: PresentationsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const expandAnd = (after?: () => void) => {
    setCollapsed(false);
    if (after) window.requestAnimationFrame(after);
  };

  const query = q.trim().toLowerCase();
  const onPath = (p: string) => !!activePath && (activePath === p || activePath.startsWith(`${p}/`));
  const visibleTree = filterTree(tree, query, onPath);
  const files = query
    ? openFolderFiles.filter((f) => f.title.toLowerCase().includes(query))
    : openFolderFiles;

  function renderNode(node: PresentationFolderTreeNode) {
    const open = onPath(node.path);
    const isCurrent = node.path === activePath;
    return (
      <div key={node.id} className="dl-tree-group">
        <Link
          href={`/presentation-hub/${node.path}`}
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
                  const b = fileBadge(file.fileType);
                  return (
                    <li key={file.id}>
                      <a className="dl-tree-file" href={`/api/presentations/file/${file.id}`}>
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
            <Link href="/presentation-hub/trash" className={cn("dl-rail-btn dl-rail-foot", activeView === "trash" && "is-active")} aria-label="Trash" title="Trash">
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
          <button type="button" className="dl-ico-btn dl-collapse-btn" aria-label="Collapse sidebar" title="Collapse" onClick={() => setCollapsed(true)}>
            <PanelLeft aria-hidden />
          </button>
        </div>
      </div>

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

      {isAdmin && (
        <div className="dl-sidebar-foot">
          <Link
            href="/presentation-hub/trash"
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

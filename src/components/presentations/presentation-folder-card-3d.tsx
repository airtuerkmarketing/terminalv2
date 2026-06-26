"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteFolder,
  renameFolder,
  setFolderColor,
} from "@/app/(public)/presentation-hub/actions";
import { DEFAULT_FOLDER_COLOR, type FolderColor } from "@/lib/documents-constants";
import type { PresentationPreviewFileDTO } from "@/lib/presentations";
// Shared 1:1 with the Document Library (D-077): same SVG folder + colour palette,
// same context-menu primitive + confirm dialog. Only the data/actions differ.
import { FolderGraphic3D, type FolderPreviewFile } from "@/components/documents/folder-card-3d";
import { ContextMenu, type CtxItem } from "@/components/documents/file-card";
import { ConfirmDialog } from "@/components/documents/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CreateFolderModal } from "./create-folder-modal";
import { PresentationFolderMoveModal } from "./presentation-folder-move-modal";

// Solid swatch shown in the colour picker (CSS-var refs → palette single-sourced).
const COLOR_SWATCHES: { value: FolderColor; color: string }[] = [
  { value: "grey", color: "var(--folder-swatch-grey)" },
  { value: "blue", color: "var(--folder-swatch-blue)" },
  { value: "green", color: "var(--folder-swatch-green)" },
  { value: "yellow", color: "var(--folder-swatch-yellow)" },
];

const THUMB = (f: FolderPreviewFile) => `/api/presentations/file/${f.id}?asset=thumb`;

/** Map a presentation preview file to the shared FolderPreviewFile shape. */
function toPreview(p: PresentationPreviewFileDTO): FolderPreviewFile {
  return { id: p.id, title: p.title, extension: p.fileType, isImage: p.hasThumbnail };
}

/** Shared folder actions (rename / subfolder / move / colour / delete) + the
 *  right-click menu and inline-rename input. The hub is login-only, so there's no
 *  public/private cue (unlike the doc library). Mirrors useFolderActions there. */
function useFolderActions({
  id,
  name,
  href,
  path,
  parentId,
  isSuperAdmin,
  autoRename = false,
  color,
}: {
  id?: string;
  name: string;
  href: string;
  path?: string;
  parentId?: string | null;
  isSuperAdmin: boolean;
  autoRename?: boolean;
  color: FolderColor;
}) {
  const router = useRouter();
  const { toast } = useToast();
  async function setColor(c: FolderColor) {
    if (!id) return;
    const res = await setFolderColor(id, c);
    if (res.ok) router.refresh();
  }

  const [editing, setEditing] = useState(!!autoRename);
  const [draft, setDraft] = useState(name);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canManage = !!id && isSuperAdmin;

  const startRename = () => {
    setDraft(name);
    setEditing(true);
  };
  async function commitRename() {
    setEditing(false);
    const t = draft.trim();
    if (!id || !t || t === name) {
      setDraft(name);
      return;
    }
    const res = await renameFolder(id, t);
    if (res.ok) router.refresh();
    else setDraft(name);
  }
  async function doDelete() {
    if (!id) return;
    setDeleting(true);
    const res = await deleteFolder(id);
    setDeleting(false);
    if (res.ok) {
      setConfirmDelete(false);
      router.refresh();
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  const menuItems: CtxItem[] = [{ kind: "item", label: "Open", onClick: () => router.push(href) }];
  if (canManage) {
    menuItems.push({
      kind: "swatches",
      label: "Color",
      value: color,
      options: COLOR_SWATCHES,
      onSelect: (v) => setColor(v as FolderColor),
    });
    menuItems.push(
      { kind: "item", label: "Rename", onClick: startRename },
      { kind: "item", label: "New subfolder", onClick: () => setCreateOpen(true) }
    );
    if (path) menuItems.push({ kind: "item", label: "Move…", onClick: () => setMoveOpen(true) });
    menuItems.push(
      { kind: "sep" },
      { kind: "item", label: "Delete folder", onClick: () => setConfirmDelete(true), danger: true }
    );
  }

  const onContextMenu = id
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }
    : undefined;
  const renameInput = (
    <input
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      className="dl-cell__rename"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitRename();
        else if (e.key === "Escape") {
          setDraft(name);
          setEditing(false);
        }
      }}
      onBlur={commitRename}
      aria-label="Rename folder"
    />
  );
  const portals = (
    <>
      {id && menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      {id && isSuperAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={id} />}
      {id && path && canManage && (
        <PresentationFolderMoveModal
          open={moveOpen}
          onClose={() => setMoveOpen(false)}
          folderId={id}
          folderPath={path}
          parentId={parentId ?? null}
        />
      )}
      {id && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={doDelete}
          tone="danger"
          title="Delete this folder?"
          message={`“${name}” will be deleted. A folder that still contains files can’t be deleted — clear its files first. This cannot be undone.`}
          confirmLabel="Delete folder"
          busy={deleting}
          icon={<Trash2 size={24} aria-hidden="true" />}
        />
      )}
    </>
  );
  return { canManage, editing, startRename, renameInput, onContextMenu, portals };
}

export interface PresentationFolderCard3DProps {
  id?: string;
  name: string;
  href: string;
  path?: string;
  parentId?: string | null;
  fileCount: number;
  previewFiles: PresentationPreviewFileDTO[];
  color?: FolderColor | null;
  isSuperAdmin?: boolean;
  className?: string;
  autoRename?: boolean;
}

export function PresentationFolderCard3D({
  id,
  name,
  href,
  path,
  parentId,
  fileCount,
  previewFiles,
  color,
  isSuperAdmin = false,
  className,
  autoRename = false,
}: PresentationFolderCard3DProps) {
  const [hovered, setHovered] = useState(false);
  const folderColor = color ?? DEFAULT_FOLDER_COLOR;
  const { canManage, editing, startRename, renameInput, onContextMenu, portals } = useFolderActions({
    id,
    name,
    href,
    path,
    parentId,
    isSuperAdmin,
    autoRename,
    color: folderColor,
  });

  return (
    <div
      className={cn("dl-cell dl-folder-cell group", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
    >
      <Link href={href} className="dl-cell__hit" aria-label={`Open ${name}`} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}>
        <span className="dl-cell__visual">
          <FolderGraphic3D previewFiles={previewFiles.map(toPreview)} isPublic hovered={hovered} color={folderColor} previewSrc={THUMB} />
        </span>
      </Link>

      {editing ? (
        renameInput
      ) : canManage ? (
        <button type="button" className="dl-cell__name" title={name} onClick={startRename}>
          {name}
        </button>
      ) : (
        <span className="dl-cell__name" title={name}>{name}</span>
      )}
      <div className="dl-cell__sub">{fileCount} {fileCount === 1 ? "file" : "files"}</div>

      {portals}
    </div>
  );
}

/** Folder as a LIST row (Windows-Explorer list view), mirrors the doc library. */
export function PresentationFolderRow({
  id,
  name,
  href,
  path,
  parentId,
  fileCount,
  color,
  isSuperAdmin = false,
  autoRename = false,
}: {
  id: string;
  name: string;
  href: string;
  path?: string;
  parentId?: string | null;
  fileCount: number;
  color?: FolderColor | null;
  isSuperAdmin?: boolean;
  autoRename?: boolean;
}) {
  const folderColor = color ?? DEFAULT_FOLDER_COLOR;
  const { editing, renameInput, onContextMenu, portals } = useFolderActions({
    id,
    name,
    href,
    path,
    parentId,
    isSuperAdmin,
    autoRename,
    color: folderColor,
  });
  return (
    <div className="dl-row dl-row--folder" onContextMenu={onContextMenu}>
      <span className="dl-row-type dl-row-type--folder" aria-hidden="true">
        <FolderGraphic3D isPublic width={40} animate={false} color={folderColor} />
      </span>
      {editing ? renameInput : <Link className="dl-row-name" href={href} title={name}>{name}</Link>}
      <span className="dl-row-lang" />
      <span className="dl-row-size">{fileCount} {fileCount === 1 ? "file" : "files"}</span>
      <span className="dl-row-modified" />
      <span className="dl-row-actions" />
      {portals}
    </div>
  );
}

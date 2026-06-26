"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import {
  deleteFolder,
  renameFolder,
  setFolderColor,
  setFolderVisibility,
} from "@/app/(public)/documents-library/actions";
import { DEFAULT_FOLDER_COLOR, type FolderColor } from "@/lib/documents-constants";
import { useToast } from "@/components/ui/toast";
import { CreateFolderModal } from "./create-folder-modal";
import { ContextMenu, type CtxItem } from "./file-card";
import { ConfirmDialog } from "./confirm-dialog";
import { FolderMoveModal } from "./folder-move-modal";

/**
 * Split-layer 3D folder card (Figma redesign). The folder is two SVG layers —
 * a back wall and a front wall (with a tab/lasche) — rendered as separate DOM
 * layers so the folder's real top files peek BETWEEN them: their top edges show
 * above the front wall even at rest, and on hover the docs rise + fan while the
 * back wall lifts slightly. Format-badge coins (self-drawn, NOT brand/app logos)
 * sit on the front wall, one per distinct file type (max 3). Neutral grey folder
 * (D-036). The overshoot hover (EASE) is a documented exception to the calm-hover
 * rule, scoped here and frozen under prefers-reduced-motion. No card box — the
 * folder stands free; only the SVG layers carry shadow.
 */

export interface FolderPreviewFile {
  id: string;
  title: string;
  extension: string;
  isImage: boolean;
}

export interface FolderCard3DProps {
  /** Folder id. When omitted (e.g. the root index, which isn't in this change's
   *  scope), the card is a plain navigation card — no context menu / rename. */
  id?: string;
  name: string;
  href: string;
  /** Folder path + parent — enable the standalone Move modal (D-074). */
  path?: string;
  parentId?: string | null;
  isPublic: boolean;
  fileCount: number;
  previewFiles: FolderPreviewFile[];
  /** Persisted folder colour (D-074); null/undefined → the default (grey). */
  color?: FolderColor | null;
  isSuperAdmin?: boolean;
  className?: string;
  /** Mount directly in rename mode (just-created folder). */
  autoRename?: boolean;
}

const EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// ── Folder colour variants ─────────────────────────────────────────────────
// The colour VALUES live in CSS (document-library.css → .dl-folder-fx[data-color]
// drives the two wall gradients + stroke; --folder-swatch-* drives the dots). Here
// we only reference them. The selected colour is a persisted, shared folder
// property (DB column, D-074) passed in as a prop — no more localStorage.
// Solid swatch shown in the context-menu colour picker (one per colour). The
// values are CSS var references so the palette stays single-sourced in CSS.
const COLOR_SWATCHES: { value: FolderColor; color: string }[] = [
  { value: "grey", color: "var(--folder-swatch-grey)" },
  { value: "blue", color: "var(--folder-swatch-blue)" },
  { value: "green", color: "var(--folder-swatch-green)" },
  { value: "yellow", color: "var(--folder-swatch-yellow)" },
];

// prefers-reduced-motion mirror (useSyncExternalStore — no setState-in-effect).
function subscribeRM(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getRM() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeRM, getRM, () => false);
}

/** Shared folder actions (rename / new subfolder / visibility / delete) + the
 *  right-click menu and inline-rename input, used by the folder card AND the
 *  folder row. Folder ops use existing server actions + router.refresh()
 *  (childFolders is a server prop, so the grid/list updates without a reload).
 *  No standalone folder-move modal is reachable from a card/row, so Move is
 *  omitted here (it lives in FolderActionsMenu on the folder's own page). */
function useFolderActions({ id, name, href, path, parentId, isPublic, isSuperAdmin, autoRename = false, color }: { id?: string; name: string; href: string; path?: string; parentId?: string | null; isPublic: boolean; isSuperAdmin: boolean; autoRename?: boolean; color: FolderColor }) {
  const router = useRouter();
  const { toast } = useToast();
  // Colour is now a shared folder property (DB, admin-write) — persist + refresh
  // so the new colour shows everywhere it's read (grid cards + sidebar tree).
  async function setColor(c: FolderColor) {
    if (!id) return;
    const res = await setFolderColor(id, c);
    if (res.ok) router.refresh();
  }
  // Freshly-created folders mount straight into rename mode (autoRename) — set as
  // the initial state so no setState-in-effect is needed; the instance persists
  // across the post-rename refresh (same id ⇒ same key), so it won't re-trigger.
  const [editing, setEditing] = useState(!!autoRename);
  const [draft, setDraft] = useState(name);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canManage = !!id && isSuperAdmin;

  const startRename = () => { setDraft(name); setEditing(true); };
  async function commitRename() {
    setEditing(false);
    const t = draft.trim();
    if (!id || !t || t === name) { setDraft(name); return; }
    const res = await renameFolder(id, t);
    if (res.ok) router.refresh(); else setDraft(name);
  }
  async function toggleVisibility() { if (!id) return; await setFolderVisibility(id, !isPublic); router.refresh(); }
  async function doDelete() {
    if (!id) return;
    setDeleting(true);
    const res = await deleteFolder(id);
    setDeleting(false);
    if (res.ok) {
      setConfirmDelete(false);
      router.refresh();
    } else {
      // e.g. the non-empty-folder guard → surface why (the dialog stays open).
      toast({ title: res.error, variant: "error" });
    }
  }

  const menuItems: CtxItem[] = [{ kind: "item", label: "Open", onClick: () => router.push(href) }];
  if (canManage) {
    // Colour is a shared folder property now (DB write) → admins only.
    menuItems.push({
      kind: "swatches",
      label: "Color",
      value: color,
      options: COLOR_SWATCHES,
      onSelect: (v) => setColor(v as FolderColor),
    });
    menuItems.push(
      { kind: "item", label: "Rename", onClick: startRename },
      { kind: "item", label: "New subfolder", onClick: () => setCreateOpen(true) },
    );
    if (path) menuItems.push({ kind: "item", label: "Move…", onClick: () => setMoveOpen(true) });
    menuItems.push(
      { kind: "item", label: isPublic ? "Make private" : "Make public", onClick: toggleVisibility },
      { kind: "sep" },
      { kind: "item", label: "Delete folder", onClick: () => setConfirmDelete(true), danger: true },
    );
  }

  // stopPropagation so a folder's own menu wins over the empty-space context menu
  // on the surrounding content area (Windows/Finder behaviour).
  const onContextMenu = id
    ? (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }
    : undefined;
  const renameInput = (
    <input
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      className="dl-cell__rename"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") commitRename(); else if (e.key === "Escape") { setDraft(name); setEditing(false); } }}
      onBlur={commitRename}
      aria-label="Rename folder"
    />
  );
  const portals = (
    <>
      {id && menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      {id && isSuperAdmin && <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} parentId={id} />}
      {id && path && canManage && (
        <FolderMoveModal
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

/** The split-layer 3D folder stage on its own — reusable + uniformly scalable by
 *  `width` so it fits both the card (full size, animated) and a list row (small,
 *  static). The 3D SVG itself is unchanged; only animation is gated by `animate`/
 *  `hovered`. Lock coin (private) lives here so card + row share it. */
export function FolderGraphic3D({
  previewFiles = [],
  isPublic,
  width = 150,
  animate = true,
  hovered = false,
  color = "grey",
  previewSrc = (f) => `/api/library/file/${f.id}`,
}: {
  previewFiles?: FolderPreviewFile[];
  isPublic: boolean;
  width?: number;
  animate?: boolean;
  hovered?: boolean;
  color?: FolderColor;
  /** Builds the <img> src for an image preview tile — overridable so the
   *  Presentation Hub can point peeks at its own thumbnail serving route. */
  previewSrc?: (f: FolderPreviewFile) => string;
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, ""); // namespace SVG gradient/filter ids per instance

  const tiles = previewFiles.slice(0, 3);
  // Degrade: not animating / 0 files / reduced-motion → folder stays closed.
  const open = animate && hovered && tiles.length > 0 && !reduced;
  const tr = (s: string) => (reduced || !animate ? "none" : s);

  // Rest vs. open fan-out for the peeking docs.
  const ROT = open ? [-15, 0, 15] : [-9, 0, 9];
  const FAN = open ? [-36, 0, 36] : [-12, 0, 12];
  const LIFT = open ? -34 : 0;

  return (
    <div className="dl-folder-fx relative" data-color={color} style={{ width, aspectRatio: "299 / 235" }}>
      {/* Back wall (behind the docs) */}
      <svg
        viewBox="0 0 299 235"
        className="absolute inset-0 w-full h-full"
        style={{
          zIndex: 1,
          overflow: "visible",
          filter: "drop-shadow(0 4px 7.5px rgba(0,0,0,0.15))",
          transform: open ? "translateY(-10px)" : "translateY(0)",
          transition: tr(`transform 500ms ${EASE}`),
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`bw-${uid}`} x1="274.301" y1="93" x2="18.3008" y2="93" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--fc-back-from)" />
            <stop offset="1" stopColor="var(--fc-back-to)" />
          </linearGradient>
        </defs>
        <path
          d="M251.301 175H41.3008C28.5982 175 18.3008 164.703 18.3008 152V34C18.3008 21.2975 28.5982 11 41.3008 11H251.301C264.003 11 274.301 21.2974 274.301 34V152C274.301 164.703 264.003 175 251.301 175Z"
          fill={`url(#bw-${uid})`}
          stroke="var(--fc-stroke)"
          strokeWidth="1"
        />
      </svg>

      {/* Peeking docs (between the walls) */}
      <div className="absolute inset-0" style={{ zIndex: 2 }} aria-hidden="true">
        {tiles.map((f, i) => (
          <div
            key={f.id}
            className="absolute overflow-hidden rounded-md border border-hairline bg-surface-strong"
            style={{
              left: "50%",
              bottom: "30%",
              width: "33%",
              height: "60%",
              transformOrigin: "bottom center",
              transform: `translate(calc(-50% + ${FAN[i]}px), ${LIFT}px) rotate(${ROT[i]}deg)`,
              transition: tr(`transform 600ms ${EASE} ${i * 70}ms`),
              zIndex: i === 1 ? 2 : 1,
              boxShadow: "var(--shadow-card)",
            }}
          >
            {f.isImage ? (
              /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
              <img src={previewSrc(f)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              /* Plain sheet (format hint removed — the old coin/badge read poorly). */
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-surface px-2">
                <span className="w-full h-1 rounded bg-hairline" />
                <span className="w-3/4 h-1 rounded bg-hairline" />
                <span className="w-1/2 h-1 rounded bg-hairline" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Front wall (+ format coins left, lock coin right) */}
      <svg
        viewBox="0 0 299 235"
        className="absolute inset-0 w-full h-full"
        style={{
          zIndex: 3,
          overflow: "visible",
          filter: "drop-shadow(0 -5px 8.9px rgba(0,0,0,0.11))",
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`fw-${uid}`} x1="149.301" y1="29" x2="149.301" y2="215" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--fc-front-from)" />
            <stop offset="1" stopColor="var(--fc-front-to)" />
          </linearGradient>
          {/* Lock badge's own soft shadow (Figma): dy3.24 blur6.47 #111826 @ 6%. */}
          <filter id={`lk-${uid}`} x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="3.24" stdDeviation="3.235" floodColor="#111826" floodOpacity="0.06" />
          </filter>
        </defs>
        <path
          d="M18.3008 192V48C18.3008 37.5066 26.8074 29 37.3008 29H117.713C126.299 29 134.746 31.1679 142.272 35.3026L164.83 47.6974C172.355 51.8321 180.803 54 189.389 54H257.301C270.003 54 280.301 64.2975 280.301 77V192C280.301 204.703 270.003 215 257.301 215H41.3008C28.5982 215 18.3008 204.703 18.3008 192Z"
          fill={`url(#fw-${uid})`}
          stroke="var(--fc-stroke)"
          strokeWidth="1"
        />
        {/* Private cue — prominent lock badge bottom-right (Lockedicon.svg, 1:1
            geometry at native 24, scaled into place). Only when private. */}
        {!isPublic && (
          <g filter={`url(#lk-${uid})`}>
            <g transform="translate(216 154) scale(2.0417)">
              <rect x="0.405" y="0.405" width="23.19" height="23.19" rx="9.7" fill="#FFCDCD" stroke="#FFA0A0" strokeWidth="0.81" />
              <g fill="none" stroke="#ED1C24" strokeWidth="1.62" strokeLinecap="round" strokeLinejoin="round">
                <rect x="7" y="10.5" width="10" height="8" rx="1.8" />
                <path d="M9 10.5V8a3 3 0 0 1 6 0v2.5" />
              </g>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

export function FolderCard3D({
  id,
  name,
  href,
  path,
  parentId,
  isPublic,
  fileCount,
  previewFiles,
  color,
  isSuperAdmin = false,
  className,
  autoRename = false,
}: FolderCard3DProps) {
  const [hovered, setHovered] = useState(false);
  const folderColor = color ?? DEFAULT_FOLDER_COLOR;
  const { canManage, editing, startRename, renameInput, onContextMenu, portals } =
    useFolderActions({ id, name, href, path, parentId, isPublic, isSuperAdmin, autoRename, color: folderColor });

  return (
    <div
      className={cn("dl-cell dl-folder-cell group", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
    >
      <Link href={href} className="dl-cell__hit" aria-label={`Open ${name}`} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}>
        {/* Folder stage — fixed aspect so the coins/docs scale with the SVG. */}
        <span className="dl-cell__visual">
          <FolderGraphic3D previewFiles={previewFiles} isPublic={isPublic} hovered={hovered} color={folderColor} />
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

/** Folder as a LIST row (Windows-Explorer list view): folder icon · name
 *  (inline-rename) · "N files" · right-click menu. Sits on the .dl-row grid like
 *  FileRow, with empty language/modified cells. */
export function FolderRow({
  id,
  name,
  href,
  path,
  parentId,
  isPublic,
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
  isPublic: boolean;
  fileCount: number;
  color?: FolderColor | null;
  isSuperAdmin?: boolean;
  autoRename?: boolean;
}) {
  const folderColor = color ?? DEFAULT_FOLDER_COLOR;
  const { editing, renameInput, onContextMenu, portals } =
    useFolderActions({ id, name, href, path, parentId, isPublic, isSuperAdmin, autoRename, color: folderColor });
  return (
    <div className="dl-row dl-row--folder" onContextMenu={onContextMenu}>
      <span className="dl-row-type dl-row-type--folder" aria-hidden="true">
        {/* Same 3D folder visual as the card, shrunk to the row (static, no fan). */}
        <FolderGraphic3D isPublic={isPublic} width={40} animate={false} color={folderColor} />
      </span>
      {/* Name navigates on click; rename is via the right-click menu. */}
      {editing ? renameInput : <Link className="dl-row-name" href={href} title={name}>{name}</Link>}
      <span className="dl-row-lang" />
      <span className="dl-row-size">{fileCount} {fileCount === 1 ? "file" : "files"}</span>
      <span className="dl-row-modified" />
      <span className="dl-row-actions" />
      {portals}
    </div>
  );
}

"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { deleteFolder, renameFolder, setFolderVisibility } from "@/app/(public)/documents-library/actions";
import { CreateFolderModal } from "./create-folder-modal";
import { ContextMenu, type CtxItem } from "./file-card";
import { ConfirmDialog } from "./confirm-dialog";

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
  isPublic: boolean;
  fileCount: number;
  previewFiles: FolderPreviewFile[];
  isSuperAdmin?: boolean;
  className?: string;
  /** Mount directly in rename mode (just-created folder). */
  autoRename?: boolean;
}

const EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// ── Folder colour variants ─────────────────────────────────────────────────
// Same SVG geometry; only the two wall gradients + the stroke change. back wall =
// stop0→stop1 (paint0, deeper), front wall = stop0→stop1 (paint1, lighter). Values
// taken from the delivered Figma SVGs (grey/blue/green/yellow).
export type FolderColor = "grey" | "blue" | "green" | "yellow";
const FOLDER_COLORS: Record<FolderColor, { backFrom: string; backTo: string; frontFrom: string; frontTo: string; stroke: string }> = {
  grey:   { backFrom: "#4C4C4C", backTo: "#676767", frontFrom: "#616161", frontTo: "#666666", stroke: "#B0B0B0" },
  blue:   { backFrom: "#C0DFFF", backTo: "#006EE2", frontFrom: "#DBEFFF", frontTo: "#9AD3FF", stroke: "#0A82DF" },
  green:  { backFrom: "#50DD57", backTo: "#196903", frontFrom: "#7CFC96", frontTo: "#47B767", stroke: "#0ADF38" },
  yellow: { backFrom: "#FFEC2D", backTo: "#A76B0B", frontFrom: "#FFFB7E", frontTo: "#EEB85C", stroke: "#DF9C0A" },
};
// Solid swatch shown in the context menu per colour.
const COLOR_SWATCHES: { value: FolderColor; color: string }[] = [
  { value: "grey", color: "#6E6E6E" },
  { value: "blue", color: "#0A82DF" },
  { value: "green", color: "#2FB344" },
  { value: "yellow", color: "#E0A100" },
];

// ── Per-folder colour persistence ───────────────────────────────────────────
// Colour is client-only for now (localStorage). Once a DB column folder.color
// exists (Buhara), replace the localStorage read/write with the DB value — the UI
// stays identical (FolderColor + FOLDER_COLORS + the context-menu swatches).
const colorKey = (id: string) => `terminal_folder_color:${id}`;
const colorListeners = new Set<() => void>();
function readFolderColor(id?: string): FolderColor {
  if (!id || typeof window === "undefined") return "grey";
  const v = window.localStorage.getItem(colorKey(id));
  return v === "blue" || v === "green" || v === "yellow" || v === "grey" ? v : "grey";
}
function writeFolderColor(id: string, color: FolderColor) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(colorKey(id), color);
  colorListeners.forEach((l) => l()); // notify same-tab subscribers
}
function subscribeFolderColor(cb: () => void) {
  colorListeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    colorListeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}
/** SSR-safe per-folder colour (server snapshot = "grey", hydrates to the stored
 *  value), mirroring the RadialKit localStorage-position pattern. */
function useFolderColor(id?: string) {
  const color = useSyncExternalStore(
    subscribeFolderColor,
    () => readFolderColor(id),
    () => "grey" as FolderColor
  );
  const setColor = (c: FolderColor) => { if (id) writeFolderColor(id, c); };
  return { color, setColor };
}

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
function useFolderActions({ id, name, href, isPublic, isSuperAdmin, autoRename = false, color, setColor }: { id?: string; name: string; href: string; isPublic: boolean; isSuperAdmin: boolean; autoRename?: boolean; color: FolderColor; setColor: (c: FolderColor) => void }) {
  const router = useRouter();
  // Freshly-created folders mount straight into rename mode (autoRename) — set as
  // the initial state so no setState-in-effect is needed; the instance persists
  // across the post-rename refresh (same id ⇒ same key), so it won't re-trigger.
  const [editing, setEditing] = useState(!!autoRename);
  const [draft, setDraft] = useState(name);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
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
    if (res.ok) { setConfirmDelete(false); router.refresh(); }
  }

  const menuItems: CtxItem[] = [{ kind: "item", label: "Open", onClick: () => router.push(href) }];
  if (id) {
    // Colour is a per-user view preference (localStorage) — offered for any folder.
    menuItems.push({
      kind: "swatches",
      label: "Color",
      value: color,
      options: COLOR_SWATCHES,
      onSelect: (v) => setColor(v as FolderColor),
    });
  }
  if (canManage) {
    menuItems.push(
      { kind: "item", label: "Rename", onClick: startRename },
      { kind: "item", label: "New subfolder", onClick: () => setCreateOpen(true) },
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
      {id && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={doDelete}
          tone="danger"
          title="Delete this folder?"
          message={`“${name}” and everything inside it (subfolders and files) will be removed. This cannot be undone.`}
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
}: {
  previewFiles?: FolderPreviewFile[];
  isPublic: boolean;
  width?: number;
  animate?: boolean;
  hovered?: boolean;
  color?: FolderColor;
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, ""); // namespace SVG gradient/filter ids per instance
  const c = FOLDER_COLORS[color] ?? FOLDER_COLORS.grey;

  const tiles = previewFiles.slice(0, 3);
  // Degrade: not animating / 0 files / reduced-motion → folder stays closed.
  const open = animate && hovered && tiles.length > 0 && !reduced;
  const tr = (s: string) => (reduced || !animate ? "none" : s);

  // Rest vs. open fan-out for the peeking docs.
  const ROT = open ? [-15, 0, 15] : [-9, 0, 9];
  const FAN = open ? [-36, 0, 36] : [-12, 0, 12];
  const LIFT = open ? -34 : 0;

  return (
    <div className="relative" style={{ width, aspectRatio: "299 / 235" }}>
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
            <stop stopColor={c.backFrom} />
            <stop offset="1" stopColor={c.backTo} />
          </linearGradient>
        </defs>
        <path
          d="M251.301 175H41.3008C28.5982 175 18.3008 164.703 18.3008 152V34C18.3008 21.2975 28.5982 11 41.3008 11H251.301C264.003 11 274.301 21.2974 274.301 34V152C274.301 164.703 264.003 175 251.301 175Z"
          fill={`url(#bw-${uid})`}
          stroke={c.stroke}
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
              <img src={`/api/library/file/${f.id}`} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
            <stop stopColor={c.frontFrom} />
            <stop offset="1" stopColor={c.frontTo} />
          </linearGradient>
          {/* Lock badge's own soft shadow (Figma): dy3.24 blur6.47 #111826 @ 6%. */}
          <filter id={`lk-${uid}`} x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="3.24" stdDeviation="3.235" floodColor="#111826" floodOpacity="0.06" />
          </filter>
        </defs>
        <path
          d="M18.3008 192V48C18.3008 37.5066 26.8074 29 37.3008 29H117.713C126.299 29 134.746 31.1679 142.272 35.3026L164.83 47.6974C172.355 51.8321 180.803 54 189.389 54H257.301C270.003 54 280.301 64.2975 280.301 77V192C280.301 204.703 270.003 215 257.301 215H41.3008C28.5982 215 18.3008 204.703 18.3008 192Z"
          fill={`url(#fw-${uid})`}
          stroke={c.stroke}
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
  isPublic,
  fileCount,
  previewFiles,
  isSuperAdmin = false,
  className,
  autoRename = false,
}: FolderCard3DProps) {
  const [hovered, setHovered] = useState(false);
  const { color, setColor } = useFolderColor(id);
  const { canManage, editing, startRename, renameInput, onContextMenu, portals } =
    useFolderActions({ id, name, href, isPublic, isSuperAdmin, autoRename, color, setColor });

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
          <FolderGraphic3D previewFiles={previewFiles} isPublic={isPublic} hovered={hovered} color={color} />
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
  isPublic,
  fileCount,
  isSuperAdmin = false,
  autoRename = false,
}: {
  id: string;
  name: string;
  href: string;
  isPublic: boolean;
  fileCount: number;
  isSuperAdmin?: boolean;
  autoRename?: boolean;
}) {
  const { color, setColor } = useFolderColor(id);
  const { editing, renameInput, onContextMenu, portals } =
    useFolderActions({ id, name, href, isPublic, isSuperAdmin, autoRename, color, setColor });
  return (
    <div className="dl-row dl-row--folder" onContextMenu={onContextMenu}>
      <span className="dl-row-type dl-row-type--folder" aria-hidden="true">
        {/* Same 3D folder visual as the card, shrunk to the row (static, no fan). */}
        <FolderGraphic3D isPublic={isPublic} width={40} animate={false} color={color} />
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

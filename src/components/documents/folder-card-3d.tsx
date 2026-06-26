"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { fileKind, type FileKind } from "@/lib/documents-constants";
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

// Self-drawn format badges (kürzel + colour) — never the Adobe/MS logos.
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

// Coin centres in the front-wall viewBox. Format coins are grouped at the LEFT
// (up to 3); the private-lock coin sits on its own at the RIGHT edge of the same
// bottom row, with a clear gap from the format cluster.
const COIN_CX = [56.5, 86.5, 116.5];
const LOCK_CX = 252.5;
const COIN_CY = 178.5;
const COIN_R = 17.5;

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
function useFolderActions({ id, name, href, isPublic, isSuperAdmin, autoRename = false }: { id?: string; name: string; href: string; isPublic: boolean; isSuperAdmin: boolean; autoRename?: boolean }) {
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
}: {
  previewFiles?: FolderPreviewFile[];
  isPublic: boolean;
  width?: number;
  animate?: boolean;
  hovered?: boolean;
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, ""); // namespace SVG gradient ids per instance

  const tiles = previewFiles.slice(0, 3);
  // Distinct file types → coins (max 3).
  const kinds: FileKind[] = [];
  for (const f of previewFiles) {
    const k = fileKind(f.extension);
    if (!kinds.includes(k)) kinds.push(k);
    if (kinds.length === 3) break;
  }
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
            <stop stopColor="#4C4C4C" />
            <stop offset="1" stopColor="#676767" />
          </linearGradient>
        </defs>
        <path
          d="M251.301 175H41.3008C28.5982 175 18.3008 164.703 18.3008 152V34C18.3008 21.2975 28.5982 11 41.3008 11H251.301C264.003 11 274.301 21.2974 274.301 34V152C274.301 164.703 264.003 175 251.301 175Z"
          fill={`url(#bw-${uid})`}
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
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-surface px-2">
                <span
                  className="inline-grid place-items-center rounded text-[8px] font-bold text-white"
                  style={{ width: 22, height: 14, background: BADGE[fileKind(f.extension)].color }}
                >
                  {BADGE[fileKind(f.extension)].label}
                </span>
                <span className="w-full h-1 rounded bg-hairline" />
                <span className="w-3/4 h-1 rounded bg-hairline" />
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
            <stop stopColor="#616161" />
            <stop offset="1" stopColor="#666666" />
          </linearGradient>
        </defs>
        <path
          d="M18.3008 192V48C18.3008 37.5066 26.8074 29 37.3008 29H117.713C126.299 29 134.746 31.1679 142.272 35.3026L164.83 47.6974C172.355 51.8321 180.803 54 189.389 54H257.301C270.003 54 280.301 64.2975 280.301 77V192C280.301 204.703 270.003 215 257.301 215H41.3008C28.5982 215 18.3008 204.703 18.3008 192Z"
          fill={`url(#fw-${uid})`}
          stroke="#B0B0B0"
          strokeWidth="1"
        />
        {kinds.map((k, i) => (
          <g key={k}>
            <circle cx={COIN_CX[i]} cy={COIN_CY} r={COIN_R} fill="#fff" />
            <text
              x={COIN_CX[i]}
              y={COIN_CY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="700"
              fontFamily="inherit"
              fill={BADGE[k].color}
            >
              {BADGE[k].label}
            </text>
          </g>
        ))}
        {/* Private cue — a red lock coin at the RIGHT edge of the bottom row, set
            apart from the left-grouped format coins. */}
        {!isPublic && (
          <g>
            <circle cx={LOCK_CX} cy={COIN_CY} r={COIN_R} fill="#fff" />
            <g
              transform={`translate(${LOCK_CX}, ${COIN_CY})`}
              fill="none"
              stroke="var(--torch)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="-7" y="-2" width="14" height="11" rx="2.5" />
              <path d="M-4 -2 V-5 a4 4 0 0 1 8 0 V-2" />
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
  const { canManage, editing, startRename, renameInput, onContextMenu, portals } =
    useFolderActions({ id, name, href, isPublic, isSuperAdmin, autoRename });

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
          <FolderGraphic3D previewFiles={previewFiles} isPublic={isPublic} hovered={hovered} />
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
  const { editing, renameInput, onContextMenu, portals } =
    useFolderActions({ id, name, href, isPublic, isSuperAdmin, autoRename });
  return (
    <div className="dl-row dl-row--folder" onContextMenu={onContextMenu}>
      <span className="dl-row-type dl-row-type--folder" aria-hidden="true">
        {/* Same 3D folder visual as the card, shrunk to the row (static, no fan). */}
        <FolderGraphic3D isPublic={isPublic} width={40} animate={false} />
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

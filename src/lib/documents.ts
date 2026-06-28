/**
 * Server-only data access + auth gates for the Document Library (File System v2).
 *
 * All READS go through the request-scoped server client so RLS applies the
 * viewer's role: anon/users see only public folders + their files, admins see
 * everything. NEVER read the library through the service-role admin client —
 * that would bypass the per-folder visibility gate (NDA leak). The admin client
 * is used only by the server actions for privileged WRITES, after an explicit
 * role check, and by the serving route to mint signed URLs.
 *
 * Do not import this module from a Client Component (pass plain DTOs instead).
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  fileKind,
  normalizeFolderColor,
  type FolderColor,
  type LanguageCode,
} from "@/lib/documents-constants";

// Auth helpers moved to src/lib/auth.ts in Stage 5 of the user panel work.
// Re-exported here for backward compatibility — existing importers
// (16 files across the repo) continue to work without edits.
export { getIdentity, requireAdmin, requireSuperAdmin } from "./auth";
export type { Identity, Role } from "./auth";

// ── DTOs (plain, client-safe shapes) ───────────────────────────────────────

export interface FolderDTO {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  path: string;
  isPublic: boolean;
  sortOrder: number;
  /** Persisted folder colour (D-074); null = the default (grey). */
  color: FolderColor | null;
}

export interface FileDTO {
  id: string;
  folderId: string;
  title: string;
  description: string | null;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  language: LanguageCode | null;
  groupId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FilesPage {
  files: FileDTO[];
  hasMore: boolean;
}

/** Sort options for the in-folder file list (matches the toolbar dropdown). */
export type FileSortKey = "name" | "date" | "size";

const FOLDER_COLS = "id, parent_id, name, slug, path, is_public, sort_order, color";
const FOLDER_COLS_BASE = "id, parent_id, name, slug, path, is_public, sort_order";

/**
 * Colour-column rollout guard (D-074). The `color` column (migration
 * 20260626170000) may not be applied in a given environment yet — so folder
 * reads must NOT hard-depend on it (selecting a missing column 500s the whole
 * library). Probe once: if `color` is absent (Postgres 42703), read the base
 * columns (colour resolves to the default grey); once present, cache that and
 * always select it. Safe to delete after the migration is everywhere.
 */
let _folderColorReady = false;
async function folderCols(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  if (_folderColorReady) return FOLDER_COLS;
  const { error } = await supabase.from("document_folders").select("color").limit(1);
  if (error?.code === "42703") return FOLDER_COLS_BASE; // not migrated yet
  _folderColorReady = true; // present (or an unrelated error → let the real read surface it)
  return FOLDER_COLS;
}

/**
 * Soft-delete (Trash) rollout guard (D-076), same pattern as the colour guard.
 * Until `deleted_at` exists, file reads skip the `deleted_at IS NULL` filter (so
 * the library renders pre-migration); once present, every normal listing/count
 * excludes trashed files. `applyLive()` adds the filter only when ready.
 */
let _trashReady = false;
async function trashReady(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  if (_trashReady) return true;
  const { error } = await supabase.from("document_files").select("deleted_at").limit(1);
  if (error?.code === "42703") return false; // not migrated yet
  _trashReady = true;
  return true;
}
const FILE_COLS =
  "id, folder_id, title, description, extension, mime_type, size_bytes, language, group_id, sort_order, created_at, updated_at";

type FolderRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  path: string;
  is_public: boolean;
  sort_order: number;
  color: string | null;
};
type FileRow = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  extension: string;
  mime_type: string;
  size_bytes: number;
  language: string | null;
  group_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapFolder(r: FolderRow): FolderDTO {
  return {
    id: r.id,
    parentId: r.parent_id,
    name: r.name,
    slug: r.slug,
    path: r.path,
    isPublic: r.is_public,
    sortOrder: r.sort_order,
    color: normalizeFolderColor(r.color),
  };
}
function mapFile(r: FileRow): FileDTO {
  return {
    id: r.id,
    folderId: r.folder_id,
    title: r.title,
    description: r.description,
    extension: r.extension,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes),
    language: (r.language as LanguageCode | null) ?? null,
    groupId: r.group_id,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── Folder reads (RLS-scoped) ───────────────────────────────────────────────

/** Visible top-level folders, ordered for cards + the sidebar sub-nav. */
export const getRootFolders = cache(async (): Promise<FolderDTO[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(await folderCols(supabase))
    .is("parent_id", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
});

/** Sidebar shows top-level folders only (one level); deeper nesting via pages. */
export const getFolderTreeForSidebar = getRootFolders;

export interface PreviewFileDTO {
  id: string;
  title: string;
  extension: string;
  isImage: boolean;
}
export interface RootFolderDTO extends FolderDTO {
  fileCount: number;
  previewFiles: PreviewFileDTO[];
}

/**
 * Decorate folders with a count of their DIRECT files + up to 3 preview files
 * (for the 3D card fan-out). RLS-scoped (the rows respect the viewer's
 * visibility, same as every read here).
 *
 * PERF-03: one batched query for the whole (bounded) folder level instead of one
 * per folder. The DB does the sort_order→created_at ordering across all folders;
 * we group the returned rows preserving that order, so each folder's count
 * (= group size) and top-3 preview are identical to the previous per-folder
 * `count:"exact" … limit(3)` query — just N+1 round-trips collapsed to one.
 */
async function withPreview(folders: FolderDTO[]): Promise<RootFolderDTO[]> {
  if (folders.length === 0) return [];
  const supabase = await createClient();
  const liveOnly = await trashReady(supabase);
  const ids = folders.map((f) => f.id);
  let q = supabase
    .from("document_files")
    .select("id, title, extension, folder_id")
    .in("folder_id", ids);
  if (liveOnly) q = q.is("deleted_at", null); // exclude trashed (D-076)
  const { data } = await q
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  type Row = { id: string; title: string; extension: string; folder_id: string };
  const byFolder = new Map<string, Row[]>();
  for (const r of (data as Row[] | null) ?? []) {
    const list = byFolder.get(r.folder_id);
    if (list) list.push(r);
    else byFolder.set(r.folder_id, [r]);
  }
  return folders.map((f) => {
    const list = byFolder.get(f.id) ?? [];
    const previewFiles: PreviewFileDTO[] = list.slice(0, 3).map((r) => ({
      id: r.id,
      title: r.title,
      extension: r.extension,
      isImage: fileKind(r.extension) === "image",
    }));
    return { ...f, fileCount: list.length, previewFiles };
  });
}

/**
 * Top-level folders for the root grid, each with file count + preview. Kept
 * separate from getRootFolders (which the per-request sidebar uses) so the
 * sidebar stays one cheap query.
 */
export async function getRootFoldersWithPreview(): Promise<RootFolderDTO[]> {
  return withPreview(await getRootFolders());
}

/**
 * Direct child folders WITH count + preview (the cards/rows on a folder page).
 * Same shape as the root grid so subfolders show a real "N files" + the docs
 * peek — not the "0 files" placeholder the bare getChildFolders gave (D-074).
 */
export async function getChildFoldersWithPreview(parentId: string): Promise<RootFolderDTO[]> {
  return withPreview(await getChildFolders(parentId));
}

/** Resolve a slug path ("business-development/contracts") to a folder, or null. */
export const getFolderByPath = cache(async (path: string): Promise<FolderDTO | null> => {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(await folderCols(supabase))
    .eq("path", clean)
    .maybeSingle();
  return data ? mapFolder(data as unknown as FolderRow) : null;
});

export async function getFolderById(id: string): Promise<FolderDTO | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(await folderCols(supabase))
    .eq("id", id)
    .maybeSingle();
  return data ? mapFolder(data as unknown as FolderRow) : null;
}

/** A single file by id (RLS-scoped) — used by mutations to return the affected row. */
export async function getFileById(id: string): Promise<FileDTO | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_files")
    .select(FILE_COLS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapFile(data as FileRow) : null;
}

/** All visible folders, ordered by path — for move-target pickers (RLS-scoped). */
export async function getAllFolders(): Promise<FolderDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(await folderCols(supabase))
    .order("path", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
}

/** Direct child folders (the chips on a folder page). */
export async function getChildFolders(folderId: string): Promise<FolderDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(await folderCols(supabase))
    .eq("parent_id", folderId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
}

/**
 * Breadcrumb ancestors (root → current), derived from the path prefixes in one
 * query. Non-visible ancestors (RLS-filtered) are simply omitted.
 */
export async function getBreadcrumb(path: string): Promise<FolderDTO[]> {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return [];
  const segs = clean.split("/");
  const prefixes = segs.map((_, i) => segs.slice(0, i + 1).join("/"));
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(await folderCols(supabase))
    .in("path", prefixes);
  return ((data as FolderRow[] | null) ?? [])
    .map(mapFolder)
    .sort((a, b) => a.path.length - b.path.length);
}

// ── Nested sidebar tree (open-path expansion) ───────────────────────────────

export interface DocFolderTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  isPublic: boolean;
  color: FolderColor | null;
  fileCount: number;
  /** True if the folder has child folders (chevron affordance when collapsed). */
  hasChildren: boolean;
  /** Loaded only when the node is on the open spine; [] for collapsed siblings. */
  children: DocFolderTreeNode[];
}

/**
 * Folder tree for the Documents-Library secondary sidebar, expanded along the
 * OPEN PATH only (D-074). Returns the full top level; every ancestor of
 * `activePath` (and the active folder itself) is expanded to show its direct
 * children — so the sidebar mirrors the breadcrumb main→sub→sub sequence at any
 * depth, with sibling folders visible at each level. Collapsed siblings carry a
 * `hasChildren` flag but no loaded children (they expand when navigated into).
 *
 * Cost: one folder query (small table, RLS-scoped) + one file-count per RENDERED
 * node (top level + the open spine's children) — never one per folder library-wide.
 */
export async function getFolderTreeForPath(
  activePath: string | null
): Promise<DocFolderTreeNode[]> {
  const all = await getAllFolders();
  const active = (activePath ?? "").replace(/^\/+|\/+$/g, "");

  // Children grouped by parent, each level ordered sort_order → name (sidebar order).
  const byParent = new Map<string | null, FolderDTO[]>();
  for (const f of all) {
    const list = byParent.get(f.parentId);
    if (list) list.push(f);
    else byParent.set(f.parentId, [f]);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  // A folder is "open" if it is the active folder or one of its ancestors.
  const isOpen = (p: string) => !!active && (active === p || active.startsWith(`${p}/`));

  // Rendered = top level + children of every open folder. Count files for exactly
  // those (RLS-scoped, so the counts match what this viewer can actually see).
  const rendered: FolderDTO[] = [];
  const collect = (parentId: string | null) => {
    for (const f of byParent.get(parentId) ?? []) {
      rendered.push(f);
      if (isOpen(f.path)) collect(f.id);
    }
  };
  collect(null);

  // PERF-03: one batched query for the counts of every rendered node (was one
  // head-count per node). RLS-scoped via the .in() filter; folders with no
  // visible files simply don't appear in the result and fall back to 0 below.
  const supabase = await createClient();
  const liveOnly = await trashReady(supabase);
  const counts = new Map<string, number>();
  const renderedIds = rendered.map((f) => f.id);
  if (renderedIds.length > 0) {
    let cq = supabase
      .from("document_files")
      .select("folder_id")
      .in("folder_id", renderedIds);
    if (liveOnly) cq = cq.is("deleted_at", null); // exclude trashed (D-076)
    const { data: countRows } = await cq;
    for (const r of (countRows as { folder_id: string }[] | null) ?? []) {
      counts.set(r.folder_id, (counts.get(r.folder_id) ?? 0) + 1);
    }
  }

  const build = (parentId: string | null): DocFolderTreeNode[] =>
    (byParent.get(parentId) ?? []).map((f) => ({
      id: f.id,
      parentId: f.parentId,
      name: f.name,
      path: f.path,
      isPublic: f.isPublic,
      color: f.color,
      fileCount: counts.get(f.id) ?? 0,
      hasChildren: (byParent.get(f.id) ?? []).length > 0,
      children: isOpen(f.path) ? build(f.id) : [],
    }));

  return build(null);
}

/** Escape SQL LIKE/ILIKE metacharacters so a search term matches literally. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Files in a folder, paginated, with optional title search + sort applied DB-side
 * so they cover the WHOLE folder, not just the loaded page. `recursive` flattens
 * the whole visible subtree (via the materialized path) — reserved for a future
 * "search incl. subfolders" toggle. RLS filters both folders and files.
 */
export async function getFilesInFolder(
  folderId: string,
  opts?: { recursive?: boolean; limit?: number; offset?: number; q?: string; sort?: FileSortKey }
): Promise<FilesPage> {
  const limit = Math.min(Math.max(opts?.limit ?? 60, 1), 200);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const sort = opts?.sort ?? "name";
  const q = (opts?.q ?? "").trim();
  const supabase = await createClient();

  let folderIds: string[] = [folderId];
  if (opts?.recursive) {
    const { data: self } = await supabase
      .from("document_folders")
      .select("path")
      .eq("id", folderId)
      .maybeSingle();
    const p = (self as { path: string } | null)?.path;
    if (p) {
      // path segments are [a-z0-9-]+ only (slug CHECK) → no PostgREST .or() grammar chars.
      const { data: desc } = await supabase
        .from("document_folders")
        .select("id")
        .or(`path.eq.${p},path.like.${p}/%`);
      folderIds = ((desc as { id: string }[] | null) ?? []).map((r) => r.id);
      if (folderIds.length === 0) folderIds = [folderId];
    }
  }

  // name → title asc; date → newest first; size → largest first. id is a stable
  // tiebreaker so pagination can't repeat/skip rows on ties. NOTE: DB collation
  // orders non-ASCII titles (ä/ö/ü/ß) slightly differently than the client's
  // locale-aware compare — a known, deliberate trade (no custom collation yet).
  const orderCol = sort === "date" ? "created_at" : sort === "size" ? "size_bytes" : "title";
  const ascending = sort === "name";

  let query = supabase
    .from("document_files")
    .select(FILE_COLS)
    .in("folder_id", folderIds);
  if (await trashReady(supabase)) query = query.is("deleted_at", null); // exclude trashed (D-076)
  // Substring title search; the term is escaped so % / _ are matched literally.
  // Index-backed by document_files_title_trgm_idx (pg_trgm GIN), migration 0031.
  if (q) query = query.ilike("title", `%${escapeLike(q)}%`);

  // Fetch limit+1 rows so hasMore is correct without a separate count query
  // (avoids a phantom "load more" on an exact-multiple last page).
  const { data } = await query
    .order(orderCol, { ascending })
    .order("id", { ascending: true })
    .range(offset, offset + limit);

  const rows = (data as FileRow[] | null) ?? [];
  const hasMore = rows.length > limit;
  const files = rows.slice(0, limit).map(mapFile);
  return { files, hasMore };
}

// ── Trash (soft-deleted files) ──────────────────────────────────────────────

export const TRASH_RETENTION_DAYS = 30;

export interface TrashedFileDTO {
  id: string;
  title: string;
  extension: string;
  sizeBytes: number;
  folderId: string;
  folderName: string;
  folderPath: string;
  deletedAt: string;
  /** Whole days until auto-purge (0 = due now). */
  daysLeft: number;
}

/**
 * All trashed files (deleted_at set), newest-deleted first, with their origin
 * folder + days-until-purge (D-076). RLS-scoped: an admin sees everything; the
 * Trash route is admin-gated. Empty before the trash migration is applied.
 */
export async function getTrashedFiles(): Promise<TrashedFileDTO[]> {
  const supabase = await createClient();
  if (!(await trashReady(supabase))) return [];
  const { data } = await supabase
    .from("document_files")
    .select("id, title, extension, size_bytes, folder_id, deleted_at, document_folders(name, path)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  const now = Date.now();
  return (
    (data as
      | {
          id: string;
          title: string;
          extension: string;
          size_bytes: number;
          folder_id: string;
          deleted_at: string;
          document_folders: { name: string; path: string } | null;
        }[]
      | null) ?? []
  ).map((r) => {
    const ageDays = Math.floor((now - new Date(r.deleted_at).getTime()) / 86_400_000);
    return {
      id: r.id,
      title: r.title,
      extension: r.extension,
      sizeBytes: Number(r.size_bytes),
      folderId: r.folder_id,
      folderName: r.document_folders?.name ?? "—",
      folderPath: r.document_folders?.path ?? "",
      deletedAt: r.deleted_at,
      daysLeft: Math.max(0, TRASH_RETENTION_DAYS - ageDays),
    };
  });
}

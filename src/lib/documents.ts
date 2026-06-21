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
import { fileKind, type LanguageCode } from "@/lib/documents-constants";

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

const FOLDER_COLS = "id, parent_id, name, slug, path, is_public, sort_order";
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
    .select(FOLDER_COLS)
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
 * Top-level folders for the root grid, each with a count of its DIRECT files and
 * up to 3 preview files (for the 3D card fan-out). RLS-scoped. Kept separate from
 * getRootFolders (which the per-request sidebar uses) so the sidebar stays one
 * cheap query; there are only a handful of top-level folders, so N small preview
 * queries here are fine.
 */
export async function getRootFoldersWithPreview(): Promise<RootFolderDTO[]> {
  const folders = await getRootFolders();
  const supabase = await createClient();
  return Promise.all(
    folders.map(async (f) => {
      const { data, count } = await supabase
        .from("document_files")
        .select("id, title, extension", { count: "exact" })
        .eq("folder_id", f.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(3);
      const previewFiles: PreviewFileDTO[] = (
        (data as { id: string; title: string; extension: string }[] | null) ?? []
      ).map((r) => ({
        id: r.id,
        title: r.title,
        extension: r.extension,
        isImage: fileKind(r.extension) === "image",
      }));
      return { ...f, fileCount: count ?? previewFiles.length, previewFiles };
    })
  );
}

/** Resolve a slug path ("business-development/contracts") to a folder, or null. */
export const getFolderByPath = cache(async (path: string): Promise<FolderDTO | null> => {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(FOLDER_COLS)
    .eq("path", clean)
    .maybeSingle();
  return data ? mapFolder(data as FolderRow) : null;
});

export async function getFolderById(id: string): Promise<FolderDTO | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(FOLDER_COLS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapFolder(data as FolderRow) : null;
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
    .select(FOLDER_COLS)
    .order("path", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
}

/** Direct child folders (the chips on a folder page). */
export async function getChildFolders(folderId: string): Promise<FolderDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select(FOLDER_COLS)
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
    .select(FOLDER_COLS)
    .in("path", prefixes);
  return ((data as FolderRow[] | null) ?? [])
    .map(mapFolder)
    .sort((a, b) => a.path.length - b.path.length);
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

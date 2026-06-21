/**
 * Server-only data access for the Presentation Hub (separate from the Document
 * Library — own tables/bucket/RLS, migration 0033).
 *
 * ┌─ SECURITY (read this before touching reads) ───────────────────────────────┐
 * │ EVERY read in this module goes through the request-scoped `createClient()`  │
 * │ so RLS applies the viewer's session. The hub is login-only: the RLS SELECT  │
 * │ policies grant rows to authenticated users only (anon sees nothing).        │
 * │ NEVER read through `createAdminClient()` here — the service role bypasses    │
 * │ RLS and would serve hub content to anonymous/unauthorized callers. The      │
 * │ admin client lives ONLY in the server actions (privileged WRITES, after a   │
 * │ requireAdmin/requireSuperAdmin check) and in the serving route (signed URLs │
 * │ minted AFTER an RLS-gated row read). presentation_views is admin-only by    │
 * │ RLS, so getFileViews returns [] for a non-admin viewer with no extra guard. │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Do not import this module from a Client Component (pass plain DTOs instead).
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { LanguageCode } from "@/lib/presentations-constants";

// ── DTOs (plain, client-safe shapes) ───────────────────────────────────────
// Storage paths NEVER leave the server: the file DTO exposes `slideCount` +
// `hasThumbnail`, and the player addresses slides by INDEX via the serving route.

export interface PresentationFolderDTO {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  path: string;
  sortOrder: number;
}

export interface TagDTO {
  id: string;
  name: string;
  displayName: string;
  color: string | null;
  sortOrder: number;
}

export interface PresentationFileDTO {
  id: string;
  folderId: string;
  title: string;
  description: string | null;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
  language: LanguageCode | null;
  groupId: string | null;
  slideCount: number;
  hasThumbnail: boolean;
  /** Derived from thumbnail_path: 'thumbnail' → show cover, 'no-thumbnail' → type-icon fallback (stage 4). */
  processingStatus: "thumbnail" | "no-thumbnail";
  isFeatured: boolean;
  featuredUntil: string | null;
  parentFileId: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  tags: TagDTO[];
}

export interface PresentationFilesPage {
  files: PresentationFileDTO[];
  hasMore: boolean;
}

export interface PresentationViewDTO {
  id: string;
  fileId: string;
  userId: string | null;
  viewedAt: string;
  durationSeconds: number | null;
}

/** Sort options for the in-folder file list (matches the toolbar dropdown). */
export type PresentationSortKey = "name" | "date" | "size";

const FOLDER_COLS = "id, parent_id, name, slug, path, sort_order";
// Note: slide_paths is intentionally OMITTED here (raw storage paths never reach
// a DTO); slideCount comes from the slide_count column, hasThumbnail from
// thumbnail_path. The serving route does its own select when it needs paths.
const FILE_COLS =
  "id, folder_id, title, description, file_type, mime_type, size_bytes, language, group_id, slide_count, thumbnail_path, is_featured, featured_until, parent_file_id, is_archived, sort_order, created_at, updated_at";
const FILE_SELECT = `${FILE_COLS}, presentation_file_tags(presentation_tags(id, name, display_name, color, sort_order))`;

type FolderRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  path: string;
  sort_order: number;
};
type TagRow = {
  id: string;
  name: string;
  display_name: string;
  color: string | null;
  sort_order: number;
};
type FileRow = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  language: string | null;
  group_id: string | null;
  slide_count: number;
  thumbnail_path: string | null;
  is_featured: boolean;
  featured_until: string | null;
  parent_file_id: string | null;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  presentation_file_tags?: { presentation_tags: TagRow | TagRow[] | null }[] | null;
};
type ViewRow = {
  id: string;
  file_id: string;
  user_id: string | null;
  viewed_at: string;
  duration_seconds: number | null;
};

function mapFolder(r: FolderRow): PresentationFolderDTO {
  return {
    id: r.id,
    parentId: r.parent_id,
    name: r.name,
    slug: r.slug,
    path: r.path,
    sortOrder: r.sort_order,
  };
}
function mapTag(r: TagRow): TagDTO {
  return {
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    color: r.color,
    sortOrder: r.sort_order,
  };
}
function mapFile(r0: unknown): PresentationFileDTO {
  // PostgREST returns the nested to-one `presentation_tags` as an object, but
  // supabase-js types it as an array — normalize both, and bridge the cast.
  const r = r0 as FileRow;
  const tags = (r.presentation_file_tags ?? [])
    .map((j) => (Array.isArray(j.presentation_tags) ? j.presentation_tags[0] ?? null : j.presentation_tags))
    .filter((t): t is TagRow => !!t)
    .map(mapTag)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
  return {
    id: r.id,
    folderId: r.folder_id,
    title: r.title,
    description: r.description,
    fileType: r.file_type,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes),
    language: (r.language as LanguageCode | null) ?? null,
    groupId: r.group_id,
    slideCount: r.slide_count ?? 0,
    hasThumbnail: !!r.thumbnail_path,
    processingStatus: r.thumbnail_path != null ? "thumbnail" : "no-thumbnail",
    isFeatured: r.is_featured,
    featuredUntil: r.featured_until,
    parentFileId: r.parent_file_id,
    isArchived: r.is_archived,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    tags,
  };
}
function mapView(r: ViewRow): PresentationViewDTO {
  return {
    id: r.id,
    fileId: r.file_id,
    userId: r.user_id,
    viewedAt: r.viewed_at,
    durationSeconds: r.duration_seconds,
  };
}

/** Escape SQL LIKE/ILIKE metacharacters so a search term matches literally. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// ── Folder reads (RLS-scoped) ───────────────────────────────────────────────

/** Visible top-level folders, ordered for cards + the sidebar sub-nav. */
export const getRootPresentationFolders = cache(async (): Promise<PresentationFolderDTO[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_folders")
    .select(FOLDER_COLS)
    .is("parent_id", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
});

export interface PresentationPreviewFileDTO {
  id: string;
  title: string;
  fileType: string;
  hasThumbnail: boolean;
}
export interface RootPresentationFolderDTO extends PresentationFolderDTO {
  fileCount: number;
  previewFiles: PresentationPreviewFileDTO[];
}

/**
 * Top-level folders for the root grid, each with a count of its DIRECT (live,
 * non-archived) files and up to 3 preview files for the 3D card fan-out. Mirrors
 * the Document Library's getRootFoldersWithPreview. RLS-scoped (createClient);
 * there are only a handful of top-level folders, so N small preview queries are
 * fine. Preview images are served by the gated route via `<img>` (no signed URL
 * minted here — same as the doc library).
 */
export async function getRootPresentationFoldersWithPreview(): Promise<RootPresentationFolderDTO[]> {
  const folders = await getRootPresentationFolders();
  const supabase = await createClient();
  return Promise.all(
    folders.map(async (f) => {
      const { data, count } = await supabase
        .from("presentation_files")
        .select("id, title, file_type, thumbnail_path", { count: "exact" })
        .eq("folder_id", f.id)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(3);
      const previewFiles: PresentationPreviewFileDTO[] = (
        (data as { id: string; title: string; file_type: string; thumbnail_path: string | null }[] | null) ?? []
      ).map((r) => ({
        id: r.id,
        title: r.title,
        fileType: r.file_type,
        hasThumbnail: r.thumbnail_path != null,
      }));
      return { ...f, fileCount: count ?? previewFiles.length, previewFiles };
    })
  );
}

/** Resolve a slug path ("sales/q3") to a folder, or null. */
export const getPresentationFolderByPath = cache(
  async (path: string): Promise<PresentationFolderDTO | null> => {
    const clean = path.replace(/^\/+|\/+$/g, "");
    if (!clean) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("presentation_folders")
      .select(FOLDER_COLS)
      .eq("path", clean)
      .maybeSingle();
    return data ? mapFolder(data as FolderRow) : null;
  }
);

export async function getPresentationFolderById(id: string): Promise<PresentationFolderDTO | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_folders")
    .select(FOLDER_COLS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapFolder(data as FolderRow) : null;
}

/** Direct child folders (the chips on a folder page + sidebar expansion). */
export async function getChildPresentationFolders(folderId: string): Promise<PresentationFolderDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_folders")
    .select(FOLDER_COLS)
    .eq("parent_id", folderId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
}

/** All visible folders, ordered by path — for admin move-target pickers (RLS-scoped). */
export async function getAllPresentationFolders(): Promise<PresentationFolderDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_folders")
    .select(FOLDER_COLS)
    .order("path", { ascending: true });
  return ((data as FolderRow[] | null) ?? []).map(mapFolder);
}

/** Breadcrumb ancestors (root → current), derived from path prefixes in one query. */
export async function getPresentationBreadcrumb(path: string): Promise<PresentationFolderDTO[]> {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return [];
  const segs = clean.split("/");
  const prefixes = segs.map((_, i) => segs.slice(0, i + 1).join("/"));
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_folders")
    .select(FOLDER_COLS)
    .in("path", prefixes);
  return ((data as FolderRow[] | null) ?? [])
    .map(mapFolder)
    .sort((a, b) => a.path.length - b.path.length);
}

// ── File reads (RLS-scoped) ─────────────────────────────────────────────────

/** A single file by id (with its tags). Used by mutations to return the affected row. */
export async function getPresentationFileById(id: string): Promise<PresentationFileDTO | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_files")
    .select(FILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? mapFile(data) : null;
}

/**
 * Files in a folder, paginated, with optional title search + sort + language/tag
 * filter applied DB-side so they cover the WHOLE folder. Live versions only
 * (`is_archived = false`) unless includeArchived. `recursive` flattens the visible
 * subtree via the materialized path. RLS filters both folders and files.
 */
export async function getPresentationFiles(
  folderId: string,
  opts?: {
    recursive?: boolean;
    limit?: number;
    offset?: number;
    q?: string;
    sort?: PresentationSortKey;
    language?: LanguageCode | null;
    tagId?: string | null;
    includeArchived?: boolean;
  }
): Promise<PresentationFilesPage> {
  const limit = Math.min(Math.max(opts?.limit ?? 60, 1), 200);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const sort = opts?.sort ?? "name";
  const q = (opts?.q ?? "").trim();
  const supabase = await createClient();

  let folderIds: string[] = [folderId];
  if (opts?.recursive) {
    const { data: self } = await supabase
      .from("presentation_folders")
      .select("path")
      .eq("id", folderId)
      .maybeSingle();
    const p = (self as { path: string } | null)?.path;
    if (p) {
      // path segments are slug-checked → no PostgREST .or() grammar characters.
      const { data: desc } = await supabase
        .from("presentation_folders")
        .select("id")
        .or(`path.eq.${p},path.like.${p}/%`);
      folderIds = ((desc as { id: string }[] | null) ?? []).map((r) => r.id);
      if (folderIds.length === 0) folderIds = [folderId];
    }
  }

  // Optional tag filter: resolve matching file ids via the junction first.
  let tagFileIds: string[] | null = null;
  if (opts?.tagId) {
    const { data: links } = await supabase
      .from("presentation_file_tags")
      .select("file_id")
      .eq("tag_id", opts.tagId);
    tagFileIds = ((links as { file_id: string }[] | null) ?? []).map((r) => r.file_id);
    if (tagFileIds.length === 0) return { files: [], hasMore: false };
  }

  const orderCol = sort === "date" ? "created_at" : sort === "size" ? "size_bytes" : "title";
  const ascending = sort === "name";

  let query = supabase.from("presentation_files").select(FILE_SELECT).in("folder_id", folderIds);
  if (!opts?.includeArchived) query = query.eq("is_archived", false);
  if (opts?.language) query = query.eq("language", opts.language);
  if (tagFileIds) query = query.in("id", tagFileIds);
  if (q) query = query.ilike("title", `%${escapeLike(q)}%`);

  // Fetch limit+1 rows so hasMore is correct without a separate count query.
  const { data } = await query
    .order(orderCol, { ascending })
    .order("id", { ascending: true })
    .range(offset, offset + limit);

  const rows = (data as FileRow[] | null) ?? [];
  const hasMore = rows.length > limit;
  const files = rows.slice(0, limit).map(mapFile);
  return { files, hasMore };
}

/**
 * Full-text search over title + description + OCR'd slide_text via the generated
 * `search_vector` (websearch grammar, 'simple' config). Optionally scoped to a
 * folder subtree (via the materialized path), else global. Live versions only.
 * RLS-scoped. (Snippet/ts_headline highlighting is a Stufe-6 RPC addition.)
 */
export async function searchPresentationFiles(
  query: string,
  opts?: { folderId?: string | null; recursive?: boolean; limit?: number }
): Promise<PresentationFileDTO[]> {
  const q = (query ?? "").trim();
  if (!q) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 100);
  const supabase = await createClient();

  let folderIds: string[] | null = null;
  if (opts?.folderId) {
    if (opts?.recursive) {
      const { data: self } = await supabase
        .from("presentation_folders")
        .select("path")
        .eq("id", opts.folderId)
        .maybeSingle();
      const p = (self as { path: string } | null)?.path;
      folderIds = p
        ? ((
            await supabase
              .from("presentation_folders")
              .select("id")
              .or(`path.eq.${p},path.like.${p}/%`)
          ).data as { id: string }[] | null ?? []).map((r) => r.id)
        : [opts.folderId];
    } else {
      folderIds = [opts.folderId];
    }
  }

  let qb = supabase
    .from("presentation_files")
    .select(FILE_SELECT)
    .eq("is_archived", false)
    .textSearch("search_vector", q, { type: "websearch", config: "simple" });
  if (folderIds) qb = qb.in("folder_id", folderIds);

  const { data } = await qb.limit(limit);
  return ((data as FileRow[] | null) ?? []).map(mapFile);
}

/**
 * Version lineage for a file: walks the parent_file_id chain from the given row
 * to the root (newest/queried → oldest), including archived versions. Linear
 * chain is what replacePresentation produces; bidirectional/group handling is a
 * V1.1 refinement when the versions UI lands.
 */
export async function getFileVersions(fileId: string): Promise<PresentationFileDTO[]> {
  const supabase = await createClient();
  const chain: PresentationFileDTO[] = [];
  let currentId: string | null = fileId;
  let guard = 0;
  while (currentId && guard < 100) {
    const { data } = await supabase
      .from("presentation_files")
      .select(FILE_SELECT)
      .eq("id", currentId)
      .maybeSingle();
    if (!data) break;
    const dto = mapFile(data);
    chain.push(dto);
    currentId = dto.parentFileId;
    guard += 1;
  }
  return chain;
}

/** All department tags, ordered for filter pills + the metadata modal. */
export const getPresentationTags = cache(async (): Promise<TagDTO[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_tags")
    .select("id, name, display_name, color, sort_order")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });
  return ((data as TagRow[] | null) ?? []).map(mapTag);
});

/**
 * Currently-featured files for the hub root hero. `featured_until` expiry is
 * filtered in JS (the featured set is tiny) to avoid a PostgREST .or() over a
 * timestamp whose fractional-second dot would confuse the column.op.value grammar.
 */
export async function getFeaturedFiles(): Promise<PresentationFileDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_files")
    .select(FILE_SELECT)
    .eq("is_featured", true)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const now = Date.now();
  return ((data as FileRow[] | null) ?? [])
    .map(mapFile)
    .filter((f) => f.featuredUntil == null || new Date(f.featuredUntil).getTime() > now);
}

/**
 * View log for a file — admin-only BY RLS (presentation_views SELECT = is_admin()).
 * A non-admin viewer simply gets [] (no extra guard needed; the RLS policy is the
 * gate). For the V1.1 view-statistics dashboard.
 */
export async function getFileViews(
  fileId: string,
  opts?: { limit?: number }
): Promise<PresentationViewDTO[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentation_views")
    .select("id, file_id, user_id, viewed_at, duration_seconds")
    .eq("file_id", fileId)
    .order("viewed_at", { ascending: false })
    .limit(limit);
  return ((data as ViewRow[] | null) ?? []).map(mapView);
}

"use server";

/**
 * Presentation Hub admin mutations (migration 0033).
 *
 * Security model (identical to the Document Library, D-052): each action
 * re-checks the caller's role server-side via requireAdmin()/requireSuperAdmin()
 * (imported from @/lib/documents — single source of truth for the session gates),
 * THEN performs the privileged write with the service-role admin client. The DB
 * RLS write policies (is_admin()) are a backstop; this app layer is the real
 * boundary and the ONLY write path. UI gating is cosmetic — never trust it.
 *
 * Structural ops (folder delete) require super_admin. Folder delete is an
 * app-level cascade (FKs are ON DELETE RESTRICT): delete file rows, then folder
 * rows bottom-up, then storage objects (best-effort, after the row deletes).
 *
 * View logging is open to any authenticated user (the only non-admin write):
 * presentation_views has no user INSERT policy, so it goes through the service
 * role after a getIdentity() check — matching the Stufe-1 RLS decision.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateImageThumbnail } from "@/lib/presentations-thumbnail";
import { getIdentity, requireAdmin, requireSuperAdmin, type Identity } from "@/lib/documents";
import {
  getAllPresentationFolders,
  getPresentationFileById,
  getPresentationFiles,
  getPresentationTags,
  searchPresentationFiles,
  type PresentationFileDTO,
  type PresentationFilesPage,
  type PresentationFolderDTO,
  type PresentationSortKey,
  type TagDTO,
} from "@/lib/presentations";
import {
  ALLOWED_EXT,
  EXT_TO_MIME,
  MAX_BYTES,
  extFromFilename,
  normalizeLanguage,
  slugify,
  type LanguageCode,
} from "@/lib/presentations-constants";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
/** File mutations return the affected row so the client can update in place (no F5). */
export type FileResult = { ok: true; file?: PresentationFileDTO } | { ok: false; error: string };
export type ViewResult = { ok: true; viewId?: string } | { ok: false; error: string };

const BUCKET = "presentations";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Admin = ReturnType<typeof createAdminClient>;

/** Map thrown auth errors + Postgres error codes to friendly messages. */
function toMessage(e: unknown, ctx: "folder" | "file" | "generic" = "generic"): string {
  const err = e as { message?: string; code?: string } | null;
  const msg = err?.message ?? String(e);
  if (msg === "NOT_AUTHENTICATED") return "Please sign in to do that.";
  if (msg === "NOT_AUTHORIZED") return "You don't have permission to do that.";
  if (/cycle/i.test(msg)) return "You can't move a folder into itself or one of its subfolders.";
  if (err?.code === "23505")
    return ctx === "folder"
      ? "A folder with that name already exists here."
      : "That item already exists.";
  if (err?.code === "23503") return "That destination no longer exists.";
  if (err?.code === "23514") return "That value isn't allowed.";
  return "Something went wrong. Please try again.";
}

/**
 * Folder STRUCTURE changes the shared sidebar (public root layout), so the whole
 * tree is revalidated. File-only changes affect just the presentation-hub pages.
 */
function revalidateStructure() {
  revalidatePath("/", "layout");
}
function revalidateFiles() {
  revalidatePath("/presentation-hub", "layout");
}

/** Validate + normalize an optional ISO datetime ("" / invalid → null). */
function normalizeIsoOrNull(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Collect every storage object owned by a set of file rows (source + thumb + slides). */
function collectStoragePaths(
  rows: { storage_path?: string | null; thumbnail_path?: string | null; slide_paths?: string[] | null }[]
): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (r.storage_path) out.push(r.storage_path);
    if (r.thumbnail_path) out.push(r.thumbnail_path);
    if (Array.isArray(r.slide_paths)) out.push(...r.slide_paths);
  }
  return out;
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);

/**
 * V1 (Strategy C): image uploads get a real thumbnail via sharp; PDF/PPTX get
 * none (UI shows a type icon). Non-blocking by contract — the result is only
 * logged, never thrown, so a thumbnail failure can't fail the upload.
 *
 * The source-blob upload hands supabase-js the `File` directly (it accepts
 * File/Blob, so no Buffer is materialized there → nothing to recycle); we read
 * the bytes into a Buffer here, only for image extensions.
 */
async function maybeGenerateThumbnail(fileId: string, ext: string, file: File): Promise<void> {
  if (!IMAGE_EXTS.has(ext)) return;
  const buf = Buffer.from(await file.arrayBuffer());
  const res = await generateImageThumbnail(fileId, buf, ext as "jpg" | "jpeg" | "png" | "webp");
  if (!res.ok) console.error("[presentation thumbnail]", fileId, res.error);
}

/**
 * Thumbnail variant for the signed-URL upload flow: the bytes go straight to
 * Storage (finalize never receives the File), so for image uploads we pull the
 * object back down to feed the same generator. Non-fatal + image-only, like above.
 */
async function maybeGenerateThumbnailFromStorage(
  fileId: string,
  ext: string,
  storagePath: string
): Promise<void> {
  if (!IMAGE_EXTS.has(ext)) return;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    console.error("[presentation thumbnail] download", fileId, error?.message ?? "no data");
    return;
  }
  const buf = Buffer.from(await data.arrayBuffer());
  const res = await generateImageThumbnail(fileId, buf, ext as "jpg" | "jpeg" | "png" | "webp");
  if (!res.ok) console.error("[presentation thumbnail]", fileId, res.error);
}

/** Replace a file's department tags (delete-all then insert the valid set). */
async function syncFileTags(admin: Admin, fileId: string, tagIds: string[]): Promise<void> {
  await admin.from("presentation_file_tags").delete().eq("file_id", fileId);
  const valid = tagIds.filter((t) => UUID_RE.test(t));
  if (valid.length > 0) {
    await admin
      .from("presentation_file_tags")
      .insert(valid.map((tag_id) => ({ file_id: fileId, tag_id })));
  }
}

// ── Read actions (RLS-gated; same visibility as the page render) ────────────

/** Folder-page search box + Sort dropdown + "Load more" — DB-side over the whole folder. */
export async function listPresentationFilesInFolder(
  folderId: string,
  opts: { q?: string; sort?: PresentationSortKey; language?: LanguageCode | null; tagId?: string | null; offset?: number; limit?: number }
): Promise<PresentationFilesPage> {
  return getPresentationFiles(folderId, {
    q: opts.q,
    sort: opts.sort,
    language: opts.language,
    tagId: opts.tagId,
    offset: opts.offset ?? 0,
    limit: opts.limit ?? 60,
  });
}

/** Global / subtree full-text search. RLS already enforces login; no extra gate. */
export async function searchPresentationsAction(
  query: string,
  opts?: { folderId?: string | null; recursive?: boolean; limit?: number }
): Promise<PresentationFileDTO[]> {
  return searchPresentationFiles(query, opts);
}

/** Visible folder list for the admin "Move" pickers (RLS-scoped, admin-gated). */
export async function listAllPresentationFolders(): Promise<PresentationFolderDTO[]> {
  await requireAdmin();
  return getAllPresentationFolders();
}

/** All department tags (for upload/edit modals + filter pills). */
export async function listPresentationTags(): Promise<TagDTO[]> {
  return getPresentationTags();
}

// ── Folder mutations ────────────────────────────────────────────────────────

export async function createFolder(parentId: string | null, name: string): Promise<ActionResult> {
  let id: Identity;
  try {
    id = await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const trimmed = (name ?? "").trim();
  const slug = slugify(trimmed);
  if (!trimmed || !slug) return { ok: false, error: "Please enter a valid folder name." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("presentation_folders")
    .insert({ parent_id: parentId, name: trimmed, slug, created_by: id.userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: toMessage(error, "folder") };
  revalidateStructure();
  return { ok: true, id: data.id as string };
}

export async function renameFolder(folderId: string, name: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const trimmed = (name ?? "").trim();
  const slug = slugify(trimmed);
  if (!trimmed || !slug) return { ok: false, error: "Please enter a valid folder name." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("presentation_folders")
    .update({ name: trimmed, slug })
    .eq("id", folderId);
  if (error) return { ok: false, error: toMessage(error, "folder") };
  revalidateStructure();
  return { ok: true };
}

export async function moveFolder(folderId: string, newParentId: string | null): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  if (folderId === newParentId) return { ok: false, error: "You can't move a folder into itself." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("presentation_folders")
    .update({ parent_id: newParentId })
    .eq("id", folderId);
  if (error) return { ok: false, error: toMessage(error, "folder") };
  revalidateStructure();
  return { ok: true };
}

/**
 * Recursive folder delete (super-admin). App-level cascade because FKs are
 * ON DELETE RESTRICT: gather the subtree, delete file rows (junction + views
 * cascade via their own FKs), delete folder rows deepest-first, then remove every
 * storage object (source + thumbnail + slides) last.
 */
export async function deleteFolder(folderId: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();

  const { data: self, error: selfErr } = await admin
    .from("presentation_folders")
    .select("path")
    .eq("id", folderId)
    .maybeSingle();
  if (selfErr) return { ok: false, error: toMessage(selfErr, "folder") };
  if (!self?.path) return { ok: false, error: "Folder not found." };
  const path = self.path as string;

  // Subtree folders (self + descendants). path segments are slug-checked → no
  // PostgREST .or() grammar characters.
  const { data: folders, error: foldErr } = await admin
    .from("presentation_folders")
    .select("id, path")
    .or(`path.eq.${path},path.like.${path}/%`);
  if (foldErr) return { ok: false, error: toMessage(foldErr, "folder") };
  const folderRows = (folders as { id: string; path: string }[] | null) ?? [];
  const folderIds = folderRows.map((f) => f.id);
  if (!folderIds.includes(folderId)) return { ok: false, error: "Folder not found." };

  // Files in the subtree (capture storage paths before deleting rows).
  const { data: files, error: filesErr } = await admin
    .from("presentation_files")
    .select("storage_path, thumbnail_path, slide_paths")
    .in("folder_id", folderIds);
  if (filesErr) return { ok: false, error: toMessage(filesErr, "folder") };
  const storagePaths = collectStoragePaths(
    (files as { storage_path: string | null; thumbnail_path: string | null; slide_paths: string[] | null }[] | null) ?? []
  );

  // 1) file rows
  const { error: delFilesErr } = await admin.from("presentation_files").delete().in("folder_id", folderIds);
  if (delFilesErr) return { ok: false, error: toMessage(delFilesErr, "folder") };

  // 2) folder rows deepest-first (longer path = deeper; child path ⊃ parent path).
  const ordered = [...folderRows].sort((a, b) => b.path.length - a.path.length);
  for (const f of ordered) {
    const { error: delErr } = await admin.from("presentation_folders").delete().eq("id", f.id);
    if (delErr) return { ok: false, error: toMessage(delErr, "folder") };
  }

  // 3) storage objects last (best-effort; orphans are harmless / GC-able).
  if (storagePaths.length > 0) await admin.storage.from(BUCKET).remove(storagePaths);

  revalidateStructure();
  return { ok: true };
}

// ── File mutations ──────────────────────────────────────────────────────────

/** Step-1 payload for the signed-URL upload (shape shared with the modal). */
export type UploadTicket =
  | { ok: true; bucket: string; path: string; token: string; fileId: string; contentType: string }
  | { ok: false; error: string };

/**
 * Two-step upload, step 1 (D-057) — see the Document Library action for the full
 * rationale. Admin-gated; mints a one-time signed upload URL so the browser PUTs
 * the bytes straight to Storage, bypassing the Next.js 1 MB Server-Action body
 * limit that made larger presentation uploads (25 MB ceiling) hang silently.
 */
export async function createPresentationUploadTicket(
  folderId: string,
  filename: string
): Promise<UploadTicket> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  if (!UUID_RE.test(folderId)) return { ok: false, error: "That destination no longer exists." };
  const ext = extFromFilename(filename);
  if (!ALLOWED_EXT.has(ext)) return { ok: false, error: "That file type isn't allowed." };
  const contentType = EXT_TO_MIME[ext];
  if (!contentType) return { ok: false, error: "That file type isn't allowed." };

  const fileId = randomUUID();
  const path = `${fileId}/source.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: toMessage(error, "file") };
  return { ok: true, bucket: BUCKET, path, token: data.token, fileId, contentType };
}

/**
 * Two-step upload, step 2. Inserts the row after the browser's signed PUT; the
 * true size is read back from Storage (which also confirms the object landed).
 * Tag links + the image thumbnail (pulled back from Storage, since finalize has
 * no File) run after, mirroring the old single-action behaviour. A row failure
 * rolls the orphaned object back.
 */
export async function finalizePresentationUpload(
  folderId: string,
  meta: {
    fileId: string;
    ext: string;
    title: string;
    description?: string | null;
    language?: string | null;
    groupId?: string | null;
    tagIds?: string[];
  }
): Promise<FileResult> {
  let id: Identity;
  try {
    id = await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  if (!UUID_RE.test(meta.fileId) || !UUID_RE.test(folderId)) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  const ext = (meta.ext ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return { ok: false, error: "That file type isn't allowed." };
  const contentType = EXT_TO_MIME[ext];
  if (!contentType) return { ok: false, error: "That file type isn't allowed." };

  const storagePath = `${meta.fileId}/source.${ext}`;
  const admin = createAdminClient();

  // Confirm the object landed + read its real size (never trust a client size).
  const { data: info, error: infoErr } = await admin.storage.from(BUCKET).info(storagePath);
  if (infoErr || !info) return { ok: false, error: "Upload didn't complete. Please try again." };
  const sizeBytes = info.size ?? 0;
  if (sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: "That file is larger than the 25 MB limit." };
  }

  const title = (meta.title ?? "").trim() || meta.fileId;
  const description = (meta.description ?? "").trim() || null;
  const language = normalizeLanguage(meta.language ?? null);
  const groupId = meta.groupId && UUID_RE.test(meta.groupId) ? meta.groupId : null;
  const tagIds = (meta.tagIds ?? []).filter((t) => UUID_RE.test(t));

  const { error: rowErr } = await admin.from("presentation_files").insert({
    id: meta.fileId,
    folder_id: folderId,
    title,
    description,
    storage_path: storagePath,
    file_type: ext,
    mime_type: contentType,
    size_bytes: sizeBytes,
    language,
    group_id: groupId,
    uploaded_by: id.userId,
  });
  if (rowErr) {
    await admin.storage.from(BUCKET).remove([storagePath]); // roll back the orphan
    return { ok: false, error: toMessage(rowErr, "file") };
  }

  if (tagIds.length > 0) await syncFileTags(admin, meta.fileId, tagIds);
  // V1.1: Pipeline für PDF/PPTX via Background-Jobs (Supabase Edge Functions oder externe API)
  await maybeGenerateThumbnailFromStorage(meta.fileId, ext, storagePath);

  revalidateFiles();
  return { ok: true, file: (await getPresentationFileById(meta.fileId)) ?? undefined };
}

export async function editPresentationMetadata(
  fileId: string,
  fields: {
    title?: string;
    description?: string | null;
    language?: string | null;
    groupId?: string | null;
    isFeatured?: boolean;
    featuredUntil?: string | null;
    tagIds?: string[];
  }
): Promise<FileResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const patch: Record<string, unknown> = {};
  if (fields.title != null) {
    const t = fields.title.trim();
    if (!t) return { ok: false, error: "Title can't be empty." };
    patch.title = t;
  }
  if (fields.description !== undefined) patch.description = (fields.description ?? "").trim() || null;
  if (fields.language !== undefined) patch.language = normalizeLanguage(fields.language);
  if (fields.groupId !== undefined)
    patch.group_id = fields.groupId && UUID_RE.test(fields.groupId) ? fields.groupId : null;
  if (fields.isFeatured !== undefined) patch.is_featured = !!fields.isFeatured;
  if (fields.featuredUntil !== undefined) patch.featured_until = normalizeIsoOrNull(fields.featuredUntil);

  const admin = createAdminClient();
  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("presentation_files").update(patch).eq("id", fileId);
    if (error) return { ok: false, error: toMessage(error, "file") };
  }
  if (fields.tagIds !== undefined) await syncFileTags(admin, fileId, fields.tagIds);
  revalidateFiles();
  return { ok: true, file: (await getPresentationFileById(fileId)) ?? undefined };
}

export async function movePresentation(fileId: string, folderId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("presentation_files").update({ folder_id: folderId }).eq("id", fileId);
  if (error) return { ok: false, error: toMessage(error, "file") };
  revalidateFiles();
  return { ok: true, id: fileId };
}

/**
 * Replace a presentation's contents WITH version history: insert a new row (new
 * id) that copies the previous row's metadata + tags, points parent_file_id at
 * the old row, and is live; then archive the old row (is_archived = true), keeping
 * its blob for history/rollback. Differs from the Document Library's in-place
 * overwrite (D-053). The new row's slides are (re)generated by the Stufe-3 pipeline.
 */
export async function replacePresentation(fileId: string, formData: FormData): Promise<FileResult> {
  let id: Identity;
  try {
    id = await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please choose a file." };
  const ext = extFromFilename(file.name);
  if (!ALLOWED_EXT.has(ext)) return { ok: false, error: "That file type isn't allowed." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That file is larger than the 25 MB limit." };
  const contentType = EXT_TO_MIME[ext];
  if (!contentType) return { ok: false, error: "That file type isn't allowed." };

  const admin = createAdminClient();
  const { data: prev, error: getErr } = await admin
    .from("presentation_files")
    .select("folder_id, title, description, language, group_id, sort_order")
    .eq("id", fileId)
    .maybeSingle();
  if (getErr) return { ok: false, error: toMessage(getErr, "file") };
  if (!prev) return { ok: false, error: "Presentation not found." };

  const newId = randomUUID();
  const storagePath = `${newId}/source.${ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });
  if (upErr) return { ok: false, error: toMessage(upErr, "file") };

  const { error: rowErr } = await admin.from("presentation_files").insert({
    id: newId,
    folder_id: prev.folder_id,
    title: prev.title,
    description: prev.description,
    storage_path: storagePath,
    file_type: ext,
    mime_type: contentType,
    size_bytes: file.size,
    language: prev.language,
    group_id: prev.group_id,
    parent_file_id: fileId,
    sort_order: prev.sort_order,
    uploaded_by: id.userId,
  });
  if (rowErr) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: toMessage(rowErr, "file") };
  }

  // copy tags from the previous version onto the new live row
  const { data: oldTags } = await admin
    .from("presentation_file_tags")
    .select("tag_id")
    .eq("file_id", fileId);
  const tagIds = ((oldTags as { tag_id: string }[] | null) ?? []).map((t) => t.tag_id);
  if (tagIds.length > 0) {
    await admin.from("presentation_file_tags").insert(tagIds.map((tag_id) => ({ file_id: newId, tag_id })));
  }

  // archive the previous version
  const { error: archErr } = await admin
    .from("presentation_files")
    .update({ is_archived: true })
    .eq("id", fileId);
  if (archErr) return { ok: false, error: toMessage(archErr, "file") };

  // V1.1: Pipeline für PDF/PPTX via Background-Jobs (Supabase Edge Functions oder externe API)
  await maybeGenerateThumbnail(newId, ext, file);

  revalidateFiles();
  return { ok: true, file: (await getPresentationFileById(newId)) ?? undefined };
}

export async function deletePresentation(fileId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { data: existing, error: getErr } = await admin
    .from("presentation_files")
    .select("storage_path, thumbnail_path, slide_paths")
    .eq("id", fileId)
    .maybeSingle();
  if (getErr) return { ok: false, error: toMessage(getErr, "file") };
  if (!existing) return { ok: true, id: fileId };

  const { error: delErr } = await admin.from("presentation_files").delete().eq("id", fileId);
  if (delErr) return { ok: false, error: toMessage(delErr, "file") };

  const paths = collectStoragePaths([
    existing as { storage_path: string | null; thumbnail_path: string | null; slide_paths: string[] | null },
  ]);
  if (paths.length > 0) await admin.storage.from(BUCKET).remove(paths);
  revalidateFiles();
  return { ok: true, id: fileId };
}

export async function togglePresentationFeatured(
  fileId: string,
  isFeatured: boolean,
  featuredUntil?: string | null
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("presentation_files")
    .update({
      is_featured: !!isFeatured,
      featured_until: isFeatured ? normalizeIsoOrNull(featuredUntil ?? null) : null,
    })
    .eq("id", fileId);
  if (error) return { ok: false, error: toMessage(error, "file") };
  revalidateFiles();
  return { ok: true, id: fileId };
}

/**
 * Log a view (any authenticated user). presentation_views has no user INSERT
 * policy, so this goes through the service role after a getIdentity() check —
 * the Stufe-1 RLS decision. Returns the view id so Stufe 5's player can update
 * duration_seconds on close.
 */
export async function logPresentationView(
  fileId: string,
  durationSeconds?: number
): Promise<ViewResult> {
  const id = await getIdentity();
  if (!id) return { ok: false, error: "Please sign in." };
  if (!UUID_RE.test(fileId)) return { ok: false, error: "Invalid presentation." };

  const dur =
    typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds >= 0
      ? Math.round(durationSeconds)
      : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("presentation_views")
    .insert({ file_id: fileId, user_id: id.userId, duration_seconds: dur })
    .select("id")
    .single();
  if (error) return { ok: false, error: toMessage(error) };
  return { ok: true, viewId: data.id as string };
}

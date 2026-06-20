"use server";

/**
 * Document Library admin mutations (File System v2).
 *
 * Security model: each action re-checks the caller's role server-side via
 * requireAdmin()/requireSuperAdmin() (which read the session), THEN performs the
 * privileged write with the service-role admin client. The DB RLS write policies
 * (is_admin()) are a backstop; this app layer is the real boundary, so these are
 * the ONLY write path. UI gating is cosmetic — never trust it.
 *
 * Structural/sensitive ops (folder delete, visibility toggle) require
 * super_admin. Folder delete is an app-level cascade (FKs are ON DELETE RESTRICT):
 * delete file rows, then folder rows bottom-up, then storage objects (best-effort,
 * after the row deletes, so a failure never loses a still-referenced blob).
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getFileById,
  getFilesInFolder,
  requireAdmin,
  requireSuperAdmin,
  type FileDTO,
  type FileSortKey,
  type Identity,
} from "@/lib/documents";
import {
  ALLOWED_EXT,
  EXT_TO_MIME,
  MAX_BYTES,
  extFromFilename,
  normalizeLanguage,
  slugify,
} from "@/lib/documents-constants";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
/** File mutations return the affected row so the client can update in place (no F5). */
export type FileResult = { ok: true; file?: FileDTO } | { ok: false; error: string };

const BUCKET = "library";

/**
 * Read action backing the folder page's search box, Sort dropdown and "Load
 * more" — search + sort run DB-side so they cover the whole folder, not just the
 * loaded page. RLS-gated (no role required; same visibility as the page render).
 */
export async function searchFilesInFolder(
  folderId: string,
  opts: { q?: string; sort?: FileSortKey; offset?: number; limit?: number }
): Promise<{ files: FileDTO[]; hasMore: boolean }> {
  const page = await getFilesInFolder(folderId, {
    q: opts.q,
    sort: opts.sort,
    offset: opts.offset ?? 0,
    limit: opts.limit ?? 60,
  });
  return { files: page.files, hasMore: page.hasMore };
}

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Folder STRUCTURE changes the shared sidebar (rendered in the public root
 * layout), so the whole tree must be revalidated. File-only changes affect just
 * the document-library pages, so those are scoped narrower.
 */
function revalidateStructure() {
  revalidatePath("/", "layout");
}
function revalidateFiles() {
  revalidatePath("/documents-library", "layout");
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
    .from("document_folders")
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
    .from("document_folders")
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
  if (folderId === newParentId) {
    return { ok: false, error: "You can't move a folder into itself." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("document_folders")
    .update({ parent_id: newParentId })
    .eq("id", folderId);
  if (error) return { ok: false, error: toMessage(error, "folder") };
  revalidateStructure();
  return { ok: true };
}

export async function setFolderVisibility(folderId: string, isPublic: boolean): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("document_folders")
    .update({ is_public: isPublic })
    .eq("id", folderId);
  if (error) return { ok: false, error: toMessage(error, "folder") };
  revalidateStructure();
  return { ok: true };
}

/**
 * Recursive folder delete (super-admin). App-level cascade because FKs are
 * ON DELETE RESTRICT: gather the subtree, delete file rows, delete folder rows
 * deepest-first (children before parents), then remove storage objects last.
 */
export async function deleteFolder(folderId: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();

  const { data: self, error: selfErr } = await admin
    .from("document_folders")
    .select("path")
    .eq("id", folderId)
    .maybeSingle();
  if (selfErr) return { ok: false, error: toMessage(selfErr, "folder") };
  if (!self?.path) return { ok: false, error: "Folder not found." };
  const path = self.path as string;

  // Subtree folders (self + descendants). path segments are slug-checked → no
  // PostgREST .or() grammar characters.
  const { data: folders, error: foldErr } = await admin
    .from("document_folders")
    .select("id, path")
    .or(`path.eq.${path},path.like.${path}/%`);
  if (foldErr) return { ok: false, error: toMessage(foldErr, "folder") };
  const folderRows = (folders as { id: string; path: string }[] | null) ?? [];
  const folderIds = folderRows.map((f) => f.id);
  if (!folderIds.includes(folderId)) return { ok: false, error: "Folder not found." };

  // Files in the subtree (capture storage paths before deleting rows).
  const { data: files, error: filesErr } = await admin
    .from("document_files")
    .select("storage_path")
    .in("folder_id", folderIds);
  if (filesErr) return { ok: false, error: toMessage(filesErr, "folder") };
  const storagePaths = ((files as { storage_path: string }[] | null) ?? []).map((f) => f.storage_path);

  // 1) file rows
  const { error: delFilesErr } = await admin.from("document_files").delete().in("folder_id", folderIds);
  if (delFilesErr) return { ok: false, error: toMessage(delFilesErr, "folder") };

  // 2) folder rows deepest-first (longer path = deeper; a child's path is a
  //    strict superstring of its parent's, so length desc ⇒ children first).
  const ordered = [...folderRows].sort((a, b) => b.path.length - a.path.length);
  for (const f of ordered) {
    const { error: delErr } = await admin.from("document_folders").delete().eq("id", f.id);
    if (delErr) return { ok: false, error: toMessage(delErr, "folder") };
  }

  // 3) storage objects last (best-effort; orphans are harmless / GC-able).
  if (storagePaths.length > 0) {
    await admin.storage.from(BUCKET).remove(storagePaths);
  }

  revalidateStructure();
  return { ok: true };
}

// ── File mutations ──────────────────────────────────────────────────────────

export async function uploadFile(folderId: string, formData: FormData): Promise<FileResult> {
  let id: Identity;
  try {
    id = await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a file." };
  }
  const ext = extFromFilename(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: "That file type isn't allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That file is larger than the 15 MB limit." };
  }

  const title =
    (formData.get("title") as string)?.trim() || file.name.replace(/\.[a-z0-9]+$/i, "");
  const description = ((formData.get("description") as string) ?? "").trim() || null;
  const language = normalizeLanguage(formData.get("language") as string | null);
  const rawGroupId = ((formData.get("groupId") as string) ?? "").trim();
  const groupId = rawGroupId && UUID_RE.test(rawGroupId) ? rawGroupId : null;

  const contentType = EXT_TO_MIME[ext];
  if (!contentType) return { ok: false, error: "That file type isn't allowed." };

  const fileId = randomUUID();
  const storagePath = `${fileId}.${ext}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });
  if (upErr) return { ok: false, error: toMessage(upErr, "file") };

  const { error: rowErr } = await admin.from("document_files").insert({
    id: fileId,
    folder_id: folderId,
    title,
    description,
    storage_path: storagePath,
    mime_type: contentType,
    extension: ext,
    size_bytes: file.size,
    language,
    group_id: groupId,
    uploaded_by: id.userId,
  });
  if (rowErr) {
    // roll back the orphaned object
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: toMessage(rowErr, "file") };
  }

  revalidateFiles();
  return { ok: true, file: (await getFileById(fileId)) ?? undefined };
}

export async function editFile(
  fileId: string,
  fields: { title?: string; description?: string | null; language?: string | null }
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
  if (Object.keys(patch).length === 0) return { ok: true, file: (await getFileById(fileId)) ?? undefined };

  const admin = createAdminClient();
  const { error } = await admin.from("document_files").update(patch).eq("id", fileId);
  if (error) return { ok: false, error: toMessage(error, "file") };
  revalidateFiles();
  return { ok: true, file: (await getFileById(fileId)) ?? undefined };
}

export async function moveFile(fileId: string, folderId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("document_files").update({ folder_id: folderId }).eq("id", fileId);
  if (error) return { ok: false, error: toMessage(error, "file") };
  revalidateFiles();
  return { ok: true, id: fileId };
}

/**
 * Replace a file's contents, keeping its row id. Same extension → overwrite the
 * same object; different extension → upload the new key, repoint the row, remove
 * the old object. No version history (D-053).
 */
export async function replaceFile(fileId: string, formData: FormData): Promise<FileResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please choose a file." };
  const ext = extFromFilename(file.name);
  if (!ALLOWED_EXT.has(ext)) return { ok: false, error: "That file type isn't allowed." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That file is larger than the 15 MB limit." };

  const admin = createAdminClient();
  const { data: existing, error: getErr } = await admin
    .from("document_files")
    .select("storage_path, extension")
    .eq("id", fileId)
    .maybeSingle();
  if (getErr) return { ok: false, error: toMessage(getErr, "file") };
  if (!existing) return { ok: false, error: "File not found." };

  const contentType = EXT_TO_MIME[ext];
  if (!contentType) return { ok: false, error: "That file type isn't allowed." };
  const oldPath = existing.storage_path as string;
  const sameExt = (existing.extension as string) === ext;
  const newPath = sameExt ? oldPath : `${fileId}.${ext}`;

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(newPath, file, { contentType, upsert: true });
  if (upErr) return { ok: false, error: toMessage(upErr, "file") };

  const { error: rowErr } = await admin
    .from("document_files")
    .update({ storage_path: newPath, extension: ext, mime_type: contentType, size_bytes: file.size })
    .eq("id", fileId);
  if (rowErr) {
    if (!sameExt) await admin.storage.from(BUCKET).remove([newPath]); // drop the orphan we just uploaded
    return { ok: false, error: toMessage(rowErr, "file") };
  }

  if (!sameExt) await admin.storage.from(BUCKET).remove([oldPath]);
  revalidateFiles();
  return { ok: true, file: (await getFileById(fileId)) ?? undefined };
}

export async function deleteFile(fileId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { data: existing, error: getErr } = await admin
    .from("document_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (getErr) return { ok: false, error: toMessage(getErr, "file") };
  if (!existing) return { ok: true, id: fileId };

  const { error: delErr } = await admin.from("document_files").delete().eq("id", fileId);
  if (delErr) return { ok: false, error: toMessage(delErr, "file") };
  await admin.storage.from(BUCKET).remove([existing.storage_path as string]);
  revalidateFiles();
  return { ok: true, id: fileId };
}

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
  getAllFolders,
  getFileById,
  getFilesInFolder,
  requireAdmin,
  requireSuperAdmin,
  type FileDTO,
  type FileSortKey,
  type FolderDTO,
  type Identity,
} from "@/lib/documents";
import {
  ALLOWED_EXT,
  EXT_TO_MIME,
  MAX_BYTES,
  extFromFilename,
  normalizeFolderColor,
  normalizeLanguage,
  slugify,
  type FolderColor,
} from "@/lib/documents-constants";
import { getAllTeamMembers, logActivity } from "@/lib/users";
import {
  notifyFolderAccess,
  type AccessMember,
  type FolderAccessResult,
  type SaveAccessResult,
} from "@/lib/folder-access";

export type ActionResult = { ok: true; id?: string; path?: string } | { ok: false; error: string };
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

/**
 * Full visible folder list for the admin "Move" pickers (RLS-scoped). Admin-gated
 * and fetched lazily when a Move modal opens, so the folder tree is no longer
 * serialized into every folder-page navigation.
 */
export async function listAllFolders(): Promise<FolderDTO[]> {
  await requireAdmin();
  return getAllFolders();
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
  if (err?.code === "42P01" || err?.code === "PGRST205" || /schema cache/i.test(msg))
    return "Folder permissions aren’t set up yet — apply the latest migration and try again.";
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
  // Return the NEW path: renaming changes the slug → the trigger rewrites `path`
  // (and every descendant's), so a caller sitting ON this folder's page must
  // redirect to the new URL or it 404s (the old slug no longer resolves).
  const { data, error } = await admin
    .from("document_folders")
    .update({ name: trimmed, slug })
    .eq("id", folderId)
    .select("path")
    .single();
  if (error) return { ok: false, error: toMessage(error, "folder") };
  revalidateStructure();
  return { ok: true, path: data?.path as string | undefined };
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

/**
 * Persist a folder's colour (D-074). Admin-gated like rename/move — the colour
 * is now a SHARED folder property (everyone sees it), replacing the old per-device
 * localStorage. `null` clears it back to the default (grey). The colour VALUES
 * live in CSS; this only stores the enum, validated against the DB CHECK.
 */
export async function setFolderColor(
  folderId: string,
  color: FolderColor | null
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const normalized = color === null ? null : normalizeFolderColor(color);
  if (color !== null && normalized === null) {
    return { ok: false, error: "That colour isn't allowed." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("document_folders")
    .update({ color: normalized })
    .eq("id", folderId);
  if (error) return { ok: false, error: toMessage(error, "folder") };
  // Colour shows in BOTH the grid cards and the shared sidebar tree → revalidate
  // the whole tree (cheap; folder structure rarely changes).
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

// ── Folder access / per-user permissions (D-080) ─────────────────────────────
//
// A super_admin grants individual people read access to a (typically private)
// folder. Access is keyed off team_members (the 63-person directory) so it can
// be granted to people not yet invited; the grant activates on their first login
// (RLS resolves auth.uid() → team_member via the profiles bridge). Granted users
// are READ-ONLY (the write policies stay admin-only) — they can open/download but
// not change anything. Both reads + writes here are super_admin-gated and go
// through the service-role client (the modal that calls them is super_admin-only).

/** The team directory + which members already have access to this folder. */
export async function getFolderAccess(folderId: string): Promise<FolderAccessResult> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  if (!UUID_RE.test(folderId)) return { ok: false, error: "That folder no longer exists." };

  const { teamMembers } = await getAllTeamMembers();
  const members: AccessMember[] = teamMembers.map((m) => ({
    teamMemberId: m.teamMemberId,
    firstName: m.firstName,
    lastName: m.lastName,
    initials: m.initials,
    department: m.department,
    avatarUrl: m.avatarUrl,
    email: m.email,
    hasAccount: m.profileId != null,
  }));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("document_folder_permissions")
    .select("team_member_id")
    .eq("folder_id", folderId);
  if (error) return { ok: false, error: toMessage(error) };
  const grantedIds = (data ?? []).map((r) => r.team_member_id as string);
  return { ok: true, data: { members, grantedIds } };
}

/**
 * Replace a folder's access list with `teamMemberIds` (the modal's current
 * selection). Diffs against the existing grants, inserts the additions, deletes
 * the removals, audit-logs the change, and emails each newly-added person
 * (fire-and-forget). Revalidates the tree so the grantee sees it immediately.
 */
export async function saveFolderAccess(
  folderId: string,
  teamMemberIds: string[]
): Promise<SaveAccessResult> {
  let id: Identity;
  try {
    id = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  if (!UUID_RE.test(folderId)) return { ok: false, error: "That folder no longer exists." };
  const wanted = Array.from(new Set((teamMemberIds ?? []).filter((t) => UUID_RE.test(t))));

  const admin = createAdminClient();
  const { data: cur, error: curErr } = await admin
    .from("document_folder_permissions")
    .select("team_member_id")
    .eq("folder_id", folderId);
  if (curErr) return { ok: false, error: toMessage(curErr) };

  const current = new Set((cur ?? []).map((r) => r.team_member_id as string));
  const toAdd = wanted.filter((t) => !current.has(t));
  const toRemove = [...current].filter((t) => !wanted.includes(t));

  if (toAdd.length) {
    const { error } = await admin.from("document_folder_permissions").insert(
      toAdd.map((tm) => ({ folder_id: folderId, team_member_id: tm, granted_by: id.userId }))
    );
    if (error) return { ok: false, error: toMessage(error) };
  }
  if (toRemove.length) {
    const { error } = await admin
      .from("document_folder_permissions")
      .delete()
      .eq("folder_id", folderId)
      .in("team_member_id", toRemove);
    if (error) return { ok: false, error: toMessage(error) };
  }

  if (toAdd.length || toRemove.length) {
    await logActivity({
      userId: id.userId,
      action: "folder_access_changed",
      resourceType: "document_folder",
      resourceId: folderId,
      metadata: { added: toAdd, removed: toRemove },
    });
    await notifyFolderAccess("document", folderId, toAdd);
    revalidateStructure(); // a grantee must see the folder/tree appear immediately
  }
  return { ok: true, added: toAdd.length, removed: toRemove.length };
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

  // Refuse to delete a non-empty folder (D-075): the user must clear its files
  // first. Count ANY file rows in the subtree (live or trashed) — deleting the
  // folder would orphan them. Column-independent (no deleted_at dependency).
  const { count: fileCount, error: cntErr } = await admin
    .from("document_files")
    .select("id", { count: "exact", head: true })
    .in("folder_id", folderIds);
  if (cntErr) return { ok: false, error: toMessage(cntErr, "folder") };
  if ((fileCount ?? 0) > 0) {
    return { ok: false, error: "This folder isn't empty. Delete the files inside it first." };
  }

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

/** Step-1 payload: a one-time signed upload URL the browser PUTs the bytes to. */
export type UploadTicket =
  | { ok: true; bucket: string; path: string; token: string; fileId: string; contentType: string }
  | { ok: false; error: string };

/**
 * Two-step upload, step 1 (D-057). Admin-gated; mints a one-time signed upload
 * URL so the browser sends the bytes STRAIGHT to Storage. This is the whole point
 * of the rewrite: the previous single-action upload streamed the file THROUGH the
 * Server Action, which silently failed for anything over the Next.js 1 MB
 * Server-Action body limit (and Vercel's ~4.5 MB request cap) — the modal hung on
 * "Uploading…" with no error. No file bytes cross this action now; the bucket's
 * own file_size_limit (15 MB) + allowed_mime_types still gate the actual PUT.
 */
export async function createDocumentUploadTicket(
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
  const path = `${fileId}.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: toMessage(error, "file") };
  return { ok: true, bucket: BUCKET, path, token: data.token, fileId, contentType };
}

/**
 * Two-step upload, step 2. After the browser finishes the signed PUT, insert the
 * row (a tiny metadata-only body — no size limit applies). The true byte size is
 * read back from Storage via `.info()`, which also CONFIRMS the object landed, so
 * a client can neither spoof the size nor finalize an upload that never happened.
 * Any row failure rolls the just-uploaded object back, exactly as before.
 */
export async function finalizeDocumentUpload(
  folderId: string,
  meta: {
    fileId: string;
    ext: string;
    title: string;
    description?: string | null;
    language?: string | null;
    groupId?: string | null;
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

  const storagePath = `${meta.fileId}.${ext}`;
  const admin = createAdminClient();

  // Confirm the object landed + read its real size (never trust a client size).
  const { data: info, error: infoErr } = await admin.storage.from(BUCKET).info(storagePath);
  if (infoErr || !info) return { ok: false, error: "Upload didn't complete. Please try again." };
  const sizeBytes = info.size ?? 0;
  if (sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: "That file is larger than the 15 MB limit." };
  }

  const title = (meta.title ?? "").trim() || meta.fileId;
  const description = (meta.description ?? "").trim() || null;
  const language = normalizeLanguage(meta.language ?? null);
  const groupId = meta.groupId && UUID_RE.test(meta.groupId) ? meta.groupId : null;

  const { error: rowErr } = await admin.from("document_files").insert({
    id: meta.fileId,
    folder_id: folderId,
    title,
    description,
    storage_path: storagePath,
    mime_type: contentType,
    extension: ext,
    size_bytes: sizeBytes,
    language,
    group_id: groupId,
    uploaded_by: id.userId,
  });
  if (rowErr) {
    await admin.storage.from(BUCKET).remove([storagePath]); // roll back the orphan
    return { ok: false, error: toMessage(rowErr, "file") };
  }

  revalidateFiles();
  return { ok: true, file: (await getFileById(meta.fileId)) ?? undefined };
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

/**
 * Delete a file → Trash (D-076). Soft delete: set deleted_at so the file leaves
 * every normal listing/count but survives 30 days (restorable). The blob stays.
 * Pre-migration fallback: if the deleted_at column doesn't exist yet, do the
 * legacy hard delete so the action never breaks.
 */
export async function deleteFile(fileId: string): Promise<ActionResult> {
  let id: Identity;
  try {
    id = await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("document_files")
    .update({ deleted_at: new Date().toISOString(), deleted_by: id.userId })
    .eq("id", fileId);
  if (error) {
    if (error.code === "42703") {
      // Trash not migrated yet → legacy hard delete.
      const res = await hardDeleteFile(fileId);
      if (res.ok) revalidateFiles();
      return res;
    }
    return { ok: false, error: toMessage(error, "file") };
  }
  revalidateFiles();
  revalidateStructure(); // folder file-counts (sidebar tree + cards) change
  return { ok: true, id: fileId };
}

/** The real removal: drop the row + the storage blob. No revalidation (callers do). */
async function hardDeleteFile(fileId: string): Promise<ActionResult> {
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
  return { ok: true, id: fileId };
}

/** Restore a trashed file (clear deleted_at) — back to its original folder. */
export async function restoreFile(fileId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("document_files")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", fileId);
  if (error) return { ok: false, error: toMessage(error, "file") };
  revalidateFiles();
  revalidateStructure();
  return { ok: true, id: fileId };
}

/** Permanently delete one trashed file (row + blob) — the "Delete forever" action. */
export async function deleteFilePermanently(fileId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const res = await hardDeleteFile(fileId);
  if (res.ok) {
    revalidateFiles();
    revalidateStructure();
  }
  return res;
}

/** Permanently delete EVERY trashed file (row + blob). Admin-gated. */
export async function emptyTrash(): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("document_files")
    .select("storage_path")
    .not("deleted_at", "is", null);
  if (error) {
    if (error.code === "42703") return { ok: true }; // trash not migrated yet → nothing to empty
    return { ok: false, error: toMessage(error, "file") };
  }
  const paths = ((data as { storage_path: string }[] | null) ?? []).map((r) => r.storage_path);
  if (paths.length === 0) return { ok: true };

  const { error: delErr } = await admin.from("document_files").delete().not("deleted_at", "is", null);
  if (delErr) return { ok: false, error: toMessage(delErr, "file") };
  await admin.storage.from(BUCKET).remove(paths);
  revalidateFiles();
  revalidateStructure();
  return { ok: true };
}

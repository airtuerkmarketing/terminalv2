import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Identity } from "@/lib/auth";

/**
 * Centralized permission check (D-111). The require* guards in @/lib/auth are the
 * enforced boundary the server actions call today; can() is the future-facing
 * single source of truth that the actions migrate onto. V1 scope: D-111 actions
 * only (Documents Library + AI-knowledge workflow). Presentation Hub actions are
 * added in D-112. RLS remains the DB backstop.
 *
 * Action namespace: <domain>.<resource>.<verb>.
 */
export type Action =
  // Documents Library
  | "documents.folder.create"
  | "documents.folder.rename"
  | "documents.folder.move"
  | "documents.folder.delete"
  | "documents.folder.setVisibility"
  | "documents.folder.grantAccess"
  | "documents.folder.revokeAccess"
  | "documents.file.upload"
  | "documents.file.edit"
  | "documents.file.move"
  | "documents.file.replace"
  | "documents.file.delete"
  // AI-Correction Workflow
  | "knowledge.correction.approve"
  | "knowledge.correction.reject"
  | "knowledge.correction.editAndApprove"
  | "knowledge.source.create"
  | "knowledge.source.edit"
  | "knowledge.taxonomy.edit";

export type Resource = {
  type: "folder" | "file" | "correction" | "source" | "taxonomy";
  id?: string;
};

/**
 * Returns true if `identity` may perform `action` on `resource`.
 * super_admin: everything. ai_admin: all knowledge except taxonomy. dept/ai
 * admin: documents actions scoped to folder/file ownership (create needs none).
 */
export async function can(
  identity: Identity,
  action: Action,
  resource?: Resource
): Promise<boolean> {
  if (identity.isSuperAdmin) return true;

  const [domain, resourceType, verb] = action.split(".") as [string, string, string];

  // Taxonomy: super_admin only (Q3) — super already returned true above.
  if (action === "knowledge.taxonomy.edit") return false;

  // Knowledge domain: ai_admin gets everything except taxonomy.
  if (domain === "knowledge") return identity.isAiAdmin;

  // Documents domain: dept_admin + ai_admin, scoped to ownership.
  if (domain === "documents") {
    if (!identity.isDeptAdmin && !identity.isAiAdmin) return false;

    // Create doesn't require ownership (top-level or new content).
    if (verb === "create" && resourceType === "folder") return true;

    if (!resource?.id) return false;
    if (resource.type === "folder") return isFolderOwner(identity.userId, resource.id);
    if (resource.type === "file") return isFileOwner(identity.userId, resource.id);
    return false;
  }

  return false;
}

async function isFolderOwner(userId: string, folderId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("document_folders")
    .select("created_by")
    .eq("id", folderId)
    .single();
  return data?.created_by === userId;
}

async function isFileOwner(userId: string, fileId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("document_files")
    .select("folder_id")
    .eq("id", fileId)
    .single();
  if (!data) return false;
  return isFolderOwner(userId, data.folder_id);
}

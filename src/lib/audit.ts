import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Identity } from "@/lib/auth";

/**
 * Structured audit trail (D-111). Writes to the `audit_events` table
 * (migration 20260701000000) via the service-role client — the table has no
 * INSERT policy, so RLS clients cannot write it; reads are super_admin (all) or
 * own-actor only.
 *
 * Best-effort: a failed audit write NEVER blocks the user action (it only logs
 * to the server console). Distinct from the legacy `user_activity_log` /
 * `chunk_edit_log` writers, which stay in place; this is the new structured
 * before/after event stream that also feeds the activity-notification edge fn.
 */

export type AuditAction =
  | "folder.create" | "folder.rename" | "folder.move" | "folder.delete"
  | "folder.setVisibility" | "folder.grantAccess" | "folder.revokeAccess"
  | "file.upload" | "file.edit" | "file.move" | "file.replace" | "file.delete"
  | "correction.approve" | "correction.reject" | "correction.editAndApprove"
  | "source.create" | "source.edit"
  | "role.change" | "user.invite" | "user.delete";

export type AuditResourceType =
  | "document_folder" | "document_file"
  | "ai_correction" | "company_context"
  | "profile" | "user";

export async function auditEvent(params: {
  identity: Identity;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_events").insert({
      actor_id: params.identity.userId,
      actor_role: params.identity.role,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      before: params.before ?? null,
      after: params.after ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) {
      // Don't throw — audit failure must not block the user action.
      console.error("[audit] Failed to log event:", error.message, params.action);
    }
  } catch (err) {
    console.error("[audit] Unhandled error logging event:", err);
  }
}

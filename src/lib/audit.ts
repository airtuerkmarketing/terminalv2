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

    // High-value actions also fan out an email to super_admins (D-111). Best-effort:
    // a notification failure never blocks the user action or the audit write.
    if (NOTIFY_ACTIONS.has(params.action)) {
      try {
        await admin.functions.invoke("notify-dept-admin-activity", {
          body: {
            actor_email: params.identity.email,
            actor_role: params.identity.role,
            action: params.action,
            resource_type: params.resourceType,
            resource_id: params.resourceId,
            resource_name: extractResourceName(params.after),
            metadata: params.metadata ?? {},
            timestamp: new Date().toISOString(),
          },
        });
      } catch (notifyErr) {
        console.error("[audit] Notification invoke failed:", notifyErr);
      }
    }
  } catch (err) {
    console.error("[audit] Unhandled error logging event:", err);
  }
}

/** Actions worth an immediate super_admin email (fan-out via the edge function). */
const NOTIFY_ACTIONS = new Set<AuditAction>([
  "folder.create",
  "folder.delete",
  "folder.grantAccess",
  "folder.revokeAccess",
  "file.upload",
  "file.delete",
  "correction.approve",
  "correction.reject",
  "source.create",
]);

function extractResourceName(after: unknown): string | undefined {
  if (!after || typeof after !== "object") return undefined;
  const obj = after as Record<string, unknown>;
  return (obj.name as string) || (obj.title as string) || (obj.topic as string) || undefined;
}

"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { getUserActivityLog, type ActivityLogPage } from "@/lib/users";

/**
 * Lazy-load a user's activity log for the Stage 7B detail modal's "Aktivität"
 * tab. super_admin-gated (the panel itself is super_admin-only). `userId` is the
 * auth/profile id (user_activity_log.user_id = the actor's auth id), so the modal
 * passes the team member's profileId — only ever set for active/invited members.
 */
export async function loadUserActivity(userId: string, limit?: number): Promise<ActivityLogPage> {
  await requireSuperAdmin();
  return getUserActivityLog(userId, { limit: limit ?? 20 });
}

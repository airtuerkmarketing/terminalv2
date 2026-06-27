import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared types + helpers for per-user folder permissions (D-080), reused by both
 * the Document Library and the Presentation Hub server actions. The types are
 * library-agnostic; the actions in each route provide the RLS/revalidation glue.
 *
 * Client components may `import type` from here (type-only imports are erased, so
 * the `server-only` guard never trips for them).
 */

export type FolderKind = "document" | "presentation";

/** One pickable person in the access modal — the team_members directory row,
 *  trimmed to what the picker renders + needs. */
export interface AccessMember {
  teamMemberId: string;
  firstName: string;
  lastName: string;
  /** Precomputed initials (NOT NULL in team_members) — avatar fallback. */
  initials: string;
  department: string | null;
  /** avatars-bucket PUBLIC url, or null → render initials. */
  avatarUrl: string | null;
  email: string | null;
  /** Has a linked auth account (can actually sign in today). Grants to people
   *  without one persist and activate automatically once they're invited. */
  hasAccount: boolean;
}

export interface FolderAccessData {
  members: AccessMember[];
  /** team_member ids currently granted access to THIS folder. */
  grantedIds: string[];
}

export type FolderAccessResult =
  | { ok: true; data: FolderAccessData }
  | { ok: false; error: string };

export type SaveAccessResult =
  | { ok: true; added: number; removed: number }
  | { ok: false; error: string };

/**
 * Fire-and-forget grant-notification emails via the notify-folder-access edge
 * function. NEVER throws — a mail failure must not fail the grant. No-ops when
 * the Supabase URL / secret key isn't configured (e.g. local dev), and emails
 * each newly-added team member exactly once.
 */
export async function notifyFolderAccess(
  kind: FolderKind,
  folderId: string,
  teamMemberIds: string[]
): Promise<void> {
  if (!teamMemberIds.length) return;
  try {
    // Same path as the correction-loop emails (src/lib/knowledge/actions.ts):
    // the service-role client's functions.invoke() sets auth headers correctly.
    const admin = createAdminClient();
    await Promise.allSettled(
      teamMemberIds.map((teamMemberId) =>
        admin.functions.invoke("notify-folder-access", {
          body: { kind, folderId, teamMemberId },
        })
      )
    );
  } catch (e) {
    console.error("[notifyFolderAccess] failed:", e);
  }
}

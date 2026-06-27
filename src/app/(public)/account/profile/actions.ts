"use server";

/**
 * Self-service profile mutations (account area). The only user-facing (non-admin)
 * write path in the app: a signed-in user edits their own contact/social fields,
 * avatar, and status line. The privileged work happens in src/lib/users.ts:
 * updateOwnProfile uses the RLS client + the team_self_update policy (migration
 * 20260624111148) for the row gate plus a code-level column whitelist; the avatar
 * + auto-provision paths derive the team_member from the session, so a user can
 * only ever touch their own row. These wrappers map thrown tokens to German and
 * revalidate the page.
 */

import { revalidatePath } from "next/cache";
import {
  ensureOwnTeamMember,
  getOwnProfile,
  updateOwnAvatar,
  updateOwnProfile,
  type OwnProfile,
  type UpdateOwnProfilePatch,
} from "@/lib/users";

function toGermanMessage(err: unknown): string {
  if (!(err instanceof Error)) return "An unknown error occurred.";
  switch (err.message) {
    case "NOT_AUTHENTICATED":
      return "You are not signed in.";
    case "NOT_LINKED":
      return "Your account is not yet linked to a team profile.";
    case "PROVISION_FAILED":
      return "Profile could not be created. Please try again.";
    case "INVALID_DATE":
      return "Please enter a valid date (YYYY-MM-DD).";
    case "PHONE_TOO_LONG":
      return "Phone number too long (max. 50 characters).";
    case "STATUS_TOO_LONG":
      return "Status line too long (max. 50 characters).";
    case "VALUE_TOO_LONG":
      return "Input too long. Please shorten the text.";
    case "INVALID_FILE_TYPE":
      return "Only PNG, JPG or WebP allowed.";
    case "FILE_TOO_LARGE":
      return "Image too large (max. 2 MB).";
    case "UPDATE_FAILED":
      return "Save failed. Please try again.";
    default:
      return `Error: ${err.message}`;
  }
}

export type LoadOwnProfileResult =
  | { ok: true; profile: OwnProfile | null }
  | { ok: false; error: string };

/**
 * Read the signed-in user's own profile for the client. Used by the profile
 * modal (opened from the user menu) to lazily hydrate the form — the page route
 * still loads it server-side. `profile: null` means the account has no linked
 * team_member yet (the activation path).
 */
export async function loadOwnProfileAction(): Promise<LoadOwnProfileResult> {
  try {
    const profile = await getOwnProfile();
    return { ok: true, profile };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

export type UpdateOwnProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Update the signed-in user's own profile fields. No explicit role guard —
 * updateOwnProfile derives the actor from the session and the RLS policy enforces
 * row ownership. Email + role are never part of the patch (read-only by design).
 */
export async function updateOwnProfileAction(
  patch: UpdateOwnProfilePatch
): Promise<UpdateOwnProfileResult> {
  try {
    await updateOwnProfile(patch);
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

export type AvatarResult = { ok: true; url: string } | { ok: false; error: string };

/** Upload/replace the signed-in user's own avatar (multipart FormData, key "avatar"). */
export async function updateOwnAvatarAction(formData: FormData): Promise<AvatarResult> {
  try {
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No file selected." };
    }
    const { url } = await updateOwnAvatar(file);
    revalidatePath("/account/profile");
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

export type ActivateResult = { ok: true } | { ok: false; error: string };

/**
 * Provision + link a team_member for an account that has none yet (the one
 * deliberately-unlinked account, dev@). Lets the profile form render afterward.
 */
export async function activateOwnProfileAction(): Promise<ActivateResult> {
  try {
    await ensureOwnTeamMember();
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

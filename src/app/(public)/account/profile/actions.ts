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
  updateOwnAvatar,
  updateOwnProfile,
  type UpdateOwnProfilePatch,
} from "@/lib/users";

function toGermanMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Ein unbekannter Fehler ist aufgetreten.";
  switch (err.message) {
    case "NOT_AUTHENTICATED":
      return "Du bist nicht angemeldet.";
    case "NOT_LINKED":
      return "Dein Konto ist noch nicht mit einem Team-Profil verknüpft.";
    case "PROVISION_FAILED":
      return "Profil konnte nicht angelegt werden. Bitte erneut versuchen.";
    case "INVALID_DATE":
      return "Bitte gib ein gültiges Datum ein (JJJJ-MM-TT).";
    case "PHONE_TOO_LONG":
      return "Telefonnummer zu lang (max. 50 Zeichen).";
    case "STATUS_TOO_LONG":
      return "Status-Zeile zu lang (max. 50 Zeichen).";
    case "VALUE_TOO_LONG":
      return "Eingabe zu lang. Bitte kürze den Text.";
    case "INVALID_FILE_TYPE":
      return "Nur PNG, JPG oder WebP erlaubt.";
    case "FILE_TOO_LARGE":
      return "Bild zu groß (max. 2 MB).";
    case "UPDATE_FAILED":
      return "Speichern fehlgeschlagen. Bitte erneut versuchen.";
    default:
      return `Fehler: ${err.message}`;
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
      return { ok: false, error: "Keine Datei ausgewählt." };
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

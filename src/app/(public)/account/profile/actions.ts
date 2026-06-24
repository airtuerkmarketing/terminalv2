"use server";

/**
 * Self-service profile mutations (account area). The only user-facing (non-admin)
 * write path in the app: a signed-in user edits their own contact fields. The
 * privileged work happens in updateOwnProfile (src/lib/users.ts), which uses the
 * RLS client + the team_self_update policy (migration 20260624111148) for the row
 * gate and a code-level column whitelist. This wrapper only maps the thrown
 * tokens to German messages and revalidates the profile page.
 *
 * Real UI lands in AP 4; this action is wired now so AP 4 only builds the form.
 */

import { revalidatePath } from "next/cache";
import { updateOwnProfile } from "@/lib/users";

function toGermanMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Ein unbekannter Fehler ist aufgetreten.";
  switch (err.message) {
    case "NOT_AUTHENTICATED":
      return "Du bist nicht angemeldet.";
    case "NOT_LINKED":
      return "Dein Konto ist noch nicht mit einem Team-Mitglied verknüpft. Bitte wende dich an einen Admin.";
    case "INVALID_DATE":
      return "Bitte gib ein gültiges Datum ein (JJJJ-MM-TT).";
    case "PHONE_TOO_LONG":
      return "Telefonnummer zu lang (max. 50 Zeichen).";
    case "UPDATE_FAILED":
      return "Speichern fehlgeschlagen. Bitte erneut versuchen.";
    default:
      return `Fehler: ${err.message}`;
  }
}

export type UpdateOwnProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Update the signed-in user's own profile fields (phone, date of birth, birthday
 * visibility). No explicit role guard here — updateOwnProfile derives the actor
 * from the session and the RLS policy enforces row ownership.
 */
export async function updateOwnProfileAction(patch: {
  phone?: string | null;
  dateOfBirth?: string | null;
  showBirthday?: boolean;
}): Promise<UpdateOwnProfileResult> {
  try {
    await updateOwnProfile(patch);
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toGermanMessage(err) };
  }
}

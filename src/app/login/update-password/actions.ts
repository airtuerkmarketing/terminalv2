"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirm) {
    return { error: "The passwords do not match." };
  }

  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Not signed in. Please sign in again." };
  }

  // Step 1: Passwort via RLS-Client setzen
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: `Password could not be saved: ${updateError.message}` };
  }

  // Step 2: Flag via service-role admin client entfernen
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (initError) {
    console.error("Admin client init failed:", initError);
    return {
      error: "Password saved. But the system update failed. Please sign out and contact bdemir@airtuerk.de."
    };
  }

  // GoTrue MERGES app_metadata on updateUserById (it does not replace the object),
  // so removing a key by omission does NOT work — the merge keeps the old value and
  // updateUserById still reports success (Step 3 below then catches the stale flag).
  // A key is deleted only by sending it explicitly as `null`. Spreading the existing
  // metadata keeps provider/providers untouched under both merge and replace semantics.
  const { error: metaError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { app_metadata: { ...(user.app_metadata || {}), force_password_change: null } }
  );

  if (metaError) {
    console.error("Flag removal failed:", metaError);
    return {
      error: `Password saved. But the flag could not be removed (${metaError.message}). Please contact bdemir@airtuerk.de.`
    };
  }

  // Step 3: Self-verify dass Flag wirklich weg ist
  const { data: verifyData, error: verifyError } = await adminClient.auth.admin.getUserById(user.id);

  if (verifyError || !verifyData?.user) {
    console.error("Verify failed:", verifyError);
    return {
      error: "Password saved, but the system verification failed. Please sign out and sign in again."
    };
  }

  const flagStillThere =
    verifyData.user.app_metadata?.force_password_change === true;

  if (flagStillThere) {
    console.error("Flag still set after removal attempt!");
    return {
      error: "Password saved, but the flag removal did not take effect. Please sign out and contact bdemir@airtuerk.de."
    };
  }

  // Step 4: tell the user their password was changed (security notification).
  // Best-effort and non-blocking — runs in after() so it never delays the save
  // or the redirect, and a mail failure must never fail a successful change.
  after(() => {
    adminClient.functions
      .invoke("notify-password-changed", { body: { userId: user.id } })
      .catch((err) =>
        console.error("[update-password] notify-password-changed failed:", err),
      );
  });

  return { success: true };
}

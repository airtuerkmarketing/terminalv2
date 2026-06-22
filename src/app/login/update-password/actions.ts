"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  // Validation
  if (!password || password.length < 12) {
    return { error: "Passwort muss mindestens 12 Zeichen lang sein." };
  }
  if (password !== confirm) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const supabase = await createClient();

  // Auth-Check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Nicht eingeloggt. Bitte erneut anmelden." };
  }

  // Step 1: Passwort updaten via RLS-Client
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: `Passwort konnte nicht gespeichert werden: ${updateError.message}` };
  }

  // Step 2: Flag entfernen via service-role admin client
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (initError) {
    console.error("Admin client init failed:", initError);
    return {
      error: "Passwort gespeichert. Aber System-Update fehlgeschlagen. Bitte logge dich aus und kontaktiere bdemir@airtuerk.de."
    };
  }

  const newMetadata = { ...(user.app_metadata || {}) };
  delete newMetadata.force_password_change;

  const { error: metaError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { app_metadata: newMetadata }
  );

  if (metaError) {
    console.error("Flag removal failed:", metaError);
    return {
      error: `Passwort gespeichert. Aber Flag konnte nicht entfernt werden: ${metaError.message}. Bitte kontaktiere bdemir@airtuerk.de.`
    };
  }

  // Step 3: VERIFY — lies User nochmal um sicher zu sein
  const { data: verifyData, error: verifyError } = await adminClient.auth.admin.getUserById(user.id);

  if (verifyError || !verifyData?.user) {
    console.error("Verify failed:", verifyError);
    return {
      error: "Passwort gespeichert, aber System-Verify fehlgeschlagen. Bitte logge dich aus und wieder ein."
    };
  }

  const flagStillThere =
    verifyData.user.app_metadata?.force_password_change === true;

  if (flagStillThere) {
    console.error("Flag still set after removal attempt!");
    return {
      error: "Passwort gespeichert, aber Flag-Removal hat nicht durchgegriffen. Bitte logge dich aus und kontaktiere bdemir@airtuerk.de."
    };
  }

  // Echter Erfolg
  return { success: true };
}

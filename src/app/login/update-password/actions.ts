"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  // Server-side validation (doppelt zur Client-Seite)
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

  // Passwort updaten (über RLS-Client - User aktualisiert sein eigenes PW)
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: updateError.message };
  }

  // force_password_change Flag entfernen via service-role admin client
  // (User selbst kann app_metadata nicht ändern). createAdminClient() ist der
  // kanonische Service-Role-Client des Projekts (SUPABASE_SECRET_KEY, RLS-bypass).
  const serviceClient = createAdminClient();

  const newMetadata = { ...(user.app_metadata || {}) };
  delete newMetadata.force_password_change;

  const { error: metaError } = await serviceClient.auth.admin.updateUserById(
    user.id,
    { app_metadata: newMetadata }
  );

  if (metaError) {
    // Flag-Removal failed - log but don't block (Passwort ist ja gesetzt)
    console.error("Failed to remove force_password_change flag:", metaError);
  }

  return { success: true };
}

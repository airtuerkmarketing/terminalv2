"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Common cases: invalid credentials, email not confirmed
    return { error: error.message };
  }

  // Success — server-side redirect (also refreshes the render)
  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Send a password-reset email. The recovery template links to /auth/confirm with
 * a token_hash; after verification the user lands on /login/update-password?type=
 * recovery to set a new password.
 *
 * Always reports success (a neutral "if an account exists…" message) so the form
 * never reveals which addresses are registered (account-enumeration guard).
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  // No redirectTo: the recovery email template builds the link from GoTrue's own
  // {{ .SiteURL }} (→ /auth/confirm?type=recovery).
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    // Log every failure server-side (→ Vercel function logs) so a silently
    // dropped send is diagnosable. Previously ALL errors were swallowed and the
    // form always reported success, masking SMTP failures and rate-limits — a
    // blocked recovery mail looked identical to a delivered one. Redact the
    // local-part so we keep enough to support a user without logging full PII.
    const redacted = email.replace(/^(.).*(@.*)$/, "$1***$2");
    console.error(
      `[password-reset] resetPasswordForEmail failed for ${redacted}: ` +
        `status=${error.status ?? "?"} code=${error.code ?? "?"} ${error.message}`,
    );

    // A rate-limit (429) does NOT reveal whether the address is registered, so
    // it's safe to surface — telling the user to retry beats a false "sent".
    if (error.status === 429) {
      return {
        error:
          "Too many reset requests right now. Please wait a minute and try again.",
      };
    }
    // Any other error: keep the neutral response so we never disclose which
    // addresses exist (the server log above captures the real cause).
  }

  return { success: true };
}
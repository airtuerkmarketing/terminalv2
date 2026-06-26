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
  // {{ .SiteURL }} (→ /auth/confirm?type=recovery). Errors are intentionally
  // swallowed (don't leak which addresses exist); GoTrue also rate-limits this.
  await supabase.auth.resetPasswordForEmail(email);

  return { success: true };
}
"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Sanitize the post-login redirect target: only same-origin relative paths
  // (blocks open-redirect via a crafted ?next=https://evil.com — SEC-02).
  const next = sanitizeNext(formData.get("next") as string | null) ?? "/";

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
 *
 * The actual GoTrue → Resend SMTP send runs in `after()`, AFTER the response is
 * flushed: GoTrue hands the mail to the SMTP server synchronously and holds the
 * request open ~1.4s while it does so, which made the form's "Sending…" spinner
 * block on a round-trip the user never needs to wait for (we show the same neutral
 * message whether or not the address exists). Deferring the send lets the action
 * return in tens of ms. We use `after()` (not a bare fire-and-forget) because on
 * Vercel an un-awaited promise is killed when the serverless invocation returns —
 * `after()` keeps the function alive until the send completes. A dedicated anon
 * client (no cookies) is used so the background task never touches the request's
 * cookie store after the response is sent.
 *
 * Note: late *delivery* (mail arriving minutes later) happens downstream of this
 * hand-off — recipient MX greylisting / Resend queueing — and is not affected by
 * this code path; the send itself leaves our system in ~1.4s.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  after(async () => {
    try {
      // Cookie-free anon client: recover is an anonymous operation (no session),
      // and after() runs post-response where setting cookies is a no-op anyway.
      const supabase = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      // No redirectTo: the recovery email template builds the link from GoTrue's own
      // {{ .SiteURL }} (→ /auth/confirm?type=recovery).
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        // Log every failure server-side (→ Vercel function logs) so a silently
        // dropped send is diagnosable: a blocked recovery mail (SMTP failure,
        // rate-limit) must not look identical to a delivered one. Redact the
        // local-part so we keep enough to support a user without logging full PII.
        const redacted = email.replace(/^(.).*(@.*)$/, "$1***$2");
        console.error(
          `[password-reset] resetPasswordForEmail failed for ${redacted}: ` +
            `status=${error.status ?? "?"} code=${error.code ?? "?"} ${error.message}`,
        );
      }
    } catch (err) {
      console.error("[password-reset] background send threw:", err);
    }
  });

  // Neutral success regardless of whether the address exists (enumeration guard)
  // and regardless of the send outcome (logged above for diagnosis).
  return { success: true };
}
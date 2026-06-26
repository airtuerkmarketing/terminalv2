import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth confirmation landing for Supabase email links (invite / recovery / magic).
 *
 * This route MUST live OUTSIDE the (public) route group: it has to run BEFORE any
 * session exists so the global login gate in (public)/layout.tsx never bounces the
 * freshly-clicked invite link to /login. (Same reasoning as /login itself.)
 *
 * The Invite + Recovery email templates point here with the SSR-correct,
 * PKCE-safe `token_hash` + `type` params (see spec/AUTH_EMAIL_TEMPLATES.md). We
 * verify the one-time token, which sets the session cookies on the response, then
 * route the user to set their password:
 *   - invite   → /login/update-password?type=welcome   (first password ever)
 *   - recovery → /login/update-password?type=recovery  (forgot-password reset)
 *
 * A `?code=` branch is kept as a fallback for OAuth-style links so the route is
 * robust if the flow ever changes. On any failure we send the user to /login with
 * a friendly message rather than a silent bounce.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const explicitNext = sanitizeNext(searchParams.get("next"));

  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    const msg = "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  // Destination: an explicit ?next wins (sanitized); otherwise derive from the
  // OTP type so invite vs. recovery get the right set-password copy.
  const dest =
    explicitNext ??
    (type === "invite"
      ? "/login/update-password?type=welcome"
      : type === "recovery"
        ? "/login/update-password?type=recovery"
        : "/");

  return NextResponse.redirect(`${origin}${dest}`);
}

/** Only allow same-origin relative paths (blocks open-redirect via ?next). */
function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

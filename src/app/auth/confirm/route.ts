import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth";

/**
 * Auth confirmation landing for Supabase email links (invite / recovery / magic).
 *
 * This route MUST live OUTSIDE the (public) route group: it has to run BEFORE any
 * session exists so the global login gate in (public)/layout.tsx never bounces the
 * freshly-clicked invite link to /login. (Same reasoning as /login itself.)
 *
 * ── Why an interstitial "confirm" button and not a straight GET verify ──
 * `verifyOtp` CONSUMES the one-time `token_hash` — it is single-use. Email security
 * scanners (Microsoft Defender / Outlook "Safe Links" on the @airtuerk.de M365
 * tenant) and messenger link-preview bots (WhatsApp/Slack/Teams) automatically
 * *fetch* links seconds after delivery to scan them. A scanner's GET/HEAD would burn
 * the token before the human ever clicks — the account gets silently confirmed and
 * the real click then fails with "invalid or has expired". This was observed live:
 * a `HEAD /auth/confirm` 15s after an invite → `/verify` 200 → the human's click →
 * `/verify` 403 `otp_expired` (see spec/BUILD_LOG.md, 2026-07-01).
 *
 * The fix: GET/HEAD NEVER verify. GET renders a tiny page with a single button; the
 * actual `verifyOtp` runs only on the POST that the button submits. Prefetch/preview
 * bots issue GET/HEAD and don't submit forms, so the token survives until a human
 * clicks. Recovery links flow through this same route, so both invite and forgot-
 * password paths are protected.
 *
 * The Invite + Recovery email templates point here with the SSR-correct,
 * PKCE-safe `token_hash` + `type` params (see spec/AUTH_EMAIL_TEMPLATES.md). On a
 * successful verify we set the session cookies on the response, then route the user
 * to set their password:
 *   - invite   → /login/update-password?type=welcome   (first password ever)
 *   - recovery → /login/update-password?type=recovery  (forgot-password reset)
 *
 * A `?code=` branch is kept as a fallback for OAuth-style links. Those carry a PKCE
 * `code_verifier` cookie that only the initiating browser holds, so a scanner's
 * exchange fails harmlessly — no interstitial needed there.
 */

const INVALID_MSG = "This link is invalid or has expired. Please request a new one.";

const VALID_TYPES: readonly EmailOtpType[] = [
  "invite",
  "recovery",
  "magiclink",
  "signup",
  "email_change",
  "email",
];

function isValidType(t: string | null): t is EmailOtpType {
  return t !== null && (VALID_TYPES as readonly string[]).includes(t);
}

/** Where to send the user after a successful verify. */
function destinationFor(type: EmailOtpType | null, explicitNext: string | null): string {
  if (explicitNext) return explicitNext;
  if (type === "invite") return "/login/update-password?type=welcome";
  if (type === "recovery") return "/login/update-password?type=recovery";
  return "/";
}

function loginError(origin: string): NextResponse {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(INVALID_MSG)}`);
}

/** HTML-attribute-safe escaping for values injected into the interstitial. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The interstitial page. A plain, self-contained (no external assets), noindex page
 * whose only action is a same-route POST carrying the token. GET/HEAD prefetch bots
 * render nothing actionable; only a human click submits the form.
 */
function interstitialPage(params: {
  tokenHash: string;
  type: EmailOtpType;
  next: string | null;
}): string {
  const { tokenHash, type, next } = params;
  const isRecovery = type === "recovery";
  const heading = isRecovery ? "Passwort zurücksetzen" : "Konto aktivieren";
  const body = isRecovery
    ? "Klicke unten, um fortzufahren und ein neues Passwort festzulegen."
    : "Willkommen bei terminal. Klicke unten, um dein Konto zu aktivieren und dein Passwort festzulegen.";
  const cta = isRecovery ? "Passwort zurücksetzen" : "Konto aktivieren";
  const nextField = next
    ? `<input type="hidden" name="next" value="${esc(next)}" />`
    : "";

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(heading)} · terminal</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: #000; color: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%; max-width: 400px; text-align: center;
    border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
    padding: 40px 32px; background: #0a0a0a;
  }
  .brand { font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(255,255,255,0.55); margin-bottom: 24px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.5; color: rgba(255,255,255,0.7); margin: 0 0 28px; }
  button {
    width: 100%; padding: 14px 20px; font-size: 15px; font-weight: 600;
    color: #000; background: #fff; border: 0; border-radius: 10px; cursor: pointer;
  }
  button:hover { background: rgba(255,255,255,0.88); }
  .note { margin-top: 18px; font-size: 12px; color: rgba(255,255,255,0.4); }
</style>
</head>
<body>
  <main class="card">
    <div class="brand">terminal</div>
    <h1>${esc(heading)}</h1>
    <p>${esc(body)}</p>
    <form method="POST" action="/auth/confirm">
      <input type="hidden" name="token_hash" value="${esc(tokenHash)}" />
      <input type="hidden" name="type" value="${esc(type)}" />
      ${nextField}
      <button type="submit">${esc(cta)}</button>
    </form>
    <div class="note">Aus Sicherheitsgründen bestätige den Link mit einem Klick.</div>
  </main>
</body>
</html>`;
}

/**
 * GET — never verifies. Renders the interstitial for email one-time links
 * (`token_hash` + `type`); keeps the immediate `?code=` OAuth exchange as a fallback.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const explicitNext = sanitizeNext(searchParams.get("next"));

  // OAuth-style code exchange: not scanner-vulnerable (needs the PKCE verifier
  // cookie), so it can run immediately. Only when there is no token_hash link.
  if (code && !tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginError(origin);
    return NextResponse.redirect(`${origin}${destinationFor(null, explicitNext)}`);
  }

  if (!tokenHash || !isValidType(type)) {
    return loginError(origin);
  }

  return new NextResponse(
    interstitialPage({ tokenHash, type, next: explicitNext }),
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}

/**
 * HEAD — explicit no-op. Without this, Next.js runs the GET handler for HEAD; a
 * cheap 200 keeps scanner HEAD probes from doing any work at all.
 */
export function HEAD() {
  return new NextResponse(null, { status: 200, headers: { "cache-control": "no-store" } });
}

/**
 * POST — the only place the one-time token is consumed. Reached exclusively via the
 * interstitial button click (a human), never by a prefetch/preview bot.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const rawType = form.get("type");
  const rawNext = form.get("next");
  const type = typeof rawType === "string" && isValidType(rawType) ? rawType : null;
  const explicitNext = sanitizeNext(typeof rawNext === "string" ? rawNext : null);

  if (typeof tokenHash !== "string" || !type) {
    return loginError(origin);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return loginError(origin);
  }

  return NextResponse.redirect(`${origin}${destinationFor(type, explicitNext)}`, {
    // 303 → the browser issues a GET for the redirect target after the POST.
    status: 303,
  });
}

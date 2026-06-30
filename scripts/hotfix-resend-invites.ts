// scripts/hotfix-resend-invites.ts
//
// HOTFIX (feature/hotfix) — B1 Sofort-Recovery for invite-mail-blocked users.
//
// The invite flow does not deliver mail (recon: confirmation_sent_at NULL for both
// invited users; root cause pending the Resend delivery log). This script mints a
// one-time RECOVERY link per affected user so Buhara can hand it over manually
// (Slack/WhatsApp). It is OUTPUT-ONLY: admin.generateLink() never sends an email —
// it only generates the token (and stamps recovery_token + recovery_sent_at on the
// row). No mail leaves the system from here.
//
// Why the reconstructed /auth/confirm link (not data.properties.action_link):
//   action_link points at GoTrue's /auth/v1/verify, which establishes the session
//   via a URL fragment / its own redirect_to — neither sets the SSR cookies this
//   app reads. The app's own route src/app/auth/confirm/route.ts is the documented
//   landing: it verifyOtp()s the token_hash SERVER-SIDE (sets cookies on the
//   response), then redirects recovery -> /login/update-password?type=recovery.
//   So the shareable link must be {SITE}/auth/confirm?token_hash=<hashed>&type=recovery,
//   exactly mirroring the recovery email template (spec/AUTH_EMAIL_TEMPLATES.md).
//
// This repo uses SUPABASE_SECRET_KEY (the sb_secret_… admin key), NOT
// SUPABASE_SERVICE_ROLE_KEY. Links expire per mailer_otp_exp (~1h) — share promptly.
//
// Run: node --env-file=.env.local scripts/hotfix-resend-invites.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
// Live host = terminal.airtuerk.ai (matches Supabase auth site_url after the airtuerk.ai
// migration; the old www.airtuerk.dev was retired). NEXT_PUBLIC_SITE_URL in .env.local can
// be stale, so hardcode the known-good host here so the shared links actually load.
const SITE_URL = "https://terminal.airtuerk.ai";

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// persistSession/autoRefresh off → no background timer, process exits naturally
// (process.exit() on Windows can race the supabase keep-alive socket; see rag-eval.ts).
const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const targets = ["eadiguezel@airtuerk.de", "aoezbek@airtuerk.de"];

console.log("B1 recovery-link generation — OUTPUT ONLY, do not auto-send.\n");

for (const email of targets) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });

  console.log(`${email}`);
  if (error) {
    console.error(`  ERROR: ${error.message}`);
    console.log("");
    continue;
  }

  const hashed = data?.properties?.hashed_token;
  const shareLink = hashed
    ? `${SITE_URL}/auth/confirm?token_hash=${hashed}&type=recovery`
    : "(no hashed_token returned)";

  console.log(`  SHARE THIS LINK:   ${shareLink}`);
  console.log(`  (raw action_link): ${data?.properties?.action_link ?? "n/a"}`);
  console.log(`  type:              ${data?.properties?.verification_type ?? "n/a"}`);
  console.log("");
}

console.log("Done. Links land on /login/update-password?type=recovery after token verify.");

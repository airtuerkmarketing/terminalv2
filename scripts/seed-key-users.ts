// scripts/seed-key-users.ts
// Stage 8 pre-seeding: create auth users for the 9 key people (4 super_admins,
// 5 admins) WITHOUT sending any email (Variante B). Uses the GoTrue admin API
// createUser with email_confirm:true so the accounts are immediately active.
//
// Run with Node's native TypeScript (Node >= 23.6, here v24) + --env-file:
//   Dry run (no writes):  node --env-file=.env.local scripts/seed-key-users.ts --dry-run
//   Real run:             node --env-file=.env.local scripts/seed-key-users.ts
// (.ts so it's version-controlled — .gitignore whitelists scripts/*.ts only.)
//
// The on_auth_user_created trigger (migration 0030) creates the profiles row with
// the correct role from user_role_defaults (already populated). This script then
// patches the bidirectional FK links: team_members.auth_user_id and
// profiles.team_member_id. Idempotent: re-running skips existing auth users
// (matched by email) and re-applies the links.
//
// One crypto-random temp password is shared by all accounts created in a run and
// printed once at the end (never written to the repo). Buhara resets hers via the
// Supabase Dashboard before testing; the others stay untouched until the demo.
//
// NOTE: exits naturally (no process.exit on success) — process.exit() on Windows
// can race the supabase keep-alive socket and trip a libuv teardown assertion.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type KeyUser = { email: string; teamMemberId: string; name: string };

// team_member_id + email verified against production (see task prompt). Role is
// NOT set here — the signup trigger reads it from user_role_defaults by email.
const KEY_USERS: KeyUser[] = [
  // super_admin (4)
  { email: "bdemir@airtuerk.de", teamMemberId: "6303ee11-ece4-4a6f-b5da-79814a517947", name: "Buhara Demir" },
  { email: "eerkara@airtuerk.de", teamMemberId: "7c253651-4da8-4b76-8116-ab882c239bc3", name: "Emirkan Erkara" },
  { email: "aoezbek@airtuerk.de", teamMemberId: "0712257e-2fff-4833-b85e-cac09655d76a", name: "Ahmet Oezbek" },
  { email: "utenekeci@airtuerk.de", teamMemberId: "0a9fed1b-5bb1-43de-a4ec-9005ff5440ce", name: "Ümit Tenekeci" },
  // admin (5)
  { email: "odemir@airtuerk.de", teamMemberId: "3063656d-9f8d-41df-bd6c-6aec3c7acab7", name: "Oruc Demir" },
  { email: "skoeroglu@airtuerk.de", teamMemberId: "5a85b0e1-d688-4606-a42a-2830e8cbe87a", name: "Selin Köroglu" },
  { email: "tsahin@airtuerk.de", teamMemberId: "3681c7e7-dd7c-4d9f-95a1-19336f13dc5d", name: "Tim Sahin" },
  { email: "hakan@airtuerk.de", teamMemberId: "fc05d0a1-91a2-4f25-81d1-b262e1189ba7", name: "Hakan Sezen" },
  { email: "msinim@airtuerk.de", teamMemberId: "a7db3421-a052-45e6-90e8-b1faefeba7ea", name: "Murat Sinim" },
];

async function main(): Promise<void> {
  const DRY_RUN = process.argv.includes("--dry-run");
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("FEHLER: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlen in .env.local");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Leading "Aa1!" guarantees upper+lower+digit+symbol regardless of the random
  // hex, so createUser succeeds even if the project enables a password policy.
  const tempPassword = "Aa1!" + randomBytes(16).toString("hex");

  console.log(`\n=== Stage 8 key-user pre-seed ${DRY_RUN ? "(DRY RUN — no writes)" : "(LIVE)"} ===\n`);

  // Fetch existing auth users once (idempotency check by email).
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.error("FEHLER beim listUsers:", listErr.message);
    process.exitCode = 1;
    return;
  }
  const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

  let created = 0;
  let skipped = 0;
  let failures = 0;

  for (const u of KEY_USERS) {
    const existing = byEmail.get(u.email.toLowerCase());
    let authUserId: string;

    if (existing) {
      authUserId = existing.id;
      console.log(`SKIP    ${u.email.padEnd(24)} already exists (${authUserId})`);
      skipped++;
    } else if (DRY_RUN) {
      console.log(`CREATE  ${u.email.padEnd(24)} (would create + link → tm ${u.teamMemberId})`);
      created++;
      continue; // no auth id yet, nothing to link in a dry run
    } else {
      const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: tempPassword,
        email_confirm: true, // active immediately, no email sent
        user_metadata: { full_name: u.name },
      });
      if (createErr || !createdUser?.user) {
        console.error(`FAIL    ${u.email.padEnd(24)} createUser: ${createErr?.message ?? "no user returned"}`);
        failures++;
        continue;
      }
      authUserId = createdUser.user.id;
      console.log(`CREATE  ${u.email.padEnd(24)} → ${authUserId}`);
      created++;
    }

    if (DRY_RUN) {
      console.log(`        link  tm.auth_user_id=${authUserId} ↔ profiles.team_member_id=${u.teamMemberId}`);
      continue;
    }

    // Bidirectional FK links (idempotent). Service-role bypasses RLS.
    const { error: tmErr } = await supabase
      .from("team_members")
      .update({ auth_user_id: authUserId })
      .eq("id", u.teamMemberId);
    if (tmErr) {
      console.error(`        WARN team_members link failed: ${tmErr.message}`);
      failures++;
    }

    const { data: profRows, error: profErr } = await supabase
      .from("profiles")
      .update({ team_member_id: u.teamMemberId })
      .eq("id", authUserId)
      .select("id, role");
    if (profErr) {
      console.error(`        WARN profiles link failed: ${profErr.message}`);
      failures++;
    } else if (!profRows || profRows.length === 0) {
      console.error(`        WARN no profiles row for ${authUserId} (trigger?) — link not applied`);
      failures++;
    } else {
      console.log(`        linked (profile role=${profRows[0].role})`);
    }
  }

  console.log(`\nSummary: ${created} created/planned, ${skipped} skipped, ${failures} failures.`);

  if (DRY_RUN) {
    console.log("\nDRY RUN complete — no changes written. Re-run without --dry-run to apply.");
    return;
  }

  if (failures > 0) {
    console.error(`\n${failures} failure(s) — review above. Script is idempotent; safe to re-run.`);
    process.exitCode = 2;
  }

  if (created > 0) {
    console.log("\n========================================");
    console.log(`TEMP PASSWORD (newly created accounts): ${tempPassword}`);
    console.log("========================================");
    console.log("Buhara: sign in once and change your password via the Supabase Dashboard.");
    console.log("The other newly-created accounts stay untouched until the demo.\n");
  } else {
    console.log("\nNo new accounts created (all existed) — existing passwords unchanged.\n");
  }
}

await main();

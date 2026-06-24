/**
 * Company email domains that may receive an invite (Variante A, USER_MGMT_RECON
 * §8): only @airtuerk.de and @airtuerkholidays.de. Staff on a private address are
 * invite-locked until a corporate address exists.
 *
 * Single source of truth for the corp/private distinction:
 *  - Server: inviteUser() guards on it and throws PRIVATE_EMAIL_BLOCKED.
 *  - Client: the detail-modal invite footer + the "Nur Privat-Email" filter pill
 *    use it WITHOUT a server round-trip.
 *
 * Pure + dependency-free (no "server-only", no DOM) → importable from both the
 * server-only data layer (users.ts) and Client Components.
 */
export const CORP_EMAIL_PATTERN = /@airtuerk(holidays)?\.de$/;

/** True if `email` is a company address (@airtuerk.de / @airtuerkholidays.de). */
export function isCorpEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return CORP_EMAIL_PATTERN.test(email.trim().toLowerCase());
}

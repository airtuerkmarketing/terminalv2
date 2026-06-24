/**
 * Company email domains that may receive an invite (Variante A, USER_MGMT_RECON
 * §8). Staff on a non-company address are invite-locked until a company address
 * exists.
 *
 * Allowed domains:
 *  - @airtuerk.de, @airtuerkholidays.de — the production company domains.
 *  - @airtuerk.online — a company-owned domain (airtuerk Service GmbH, IONOS-
 *    managed) currently used as the AP-3 test mailbox. TEMPORARY: scheduled for
 *    removal in the AP-3 cleanup once invite/login testing is complete (see the
 *    plan's "Cleanup nach AP 3"). Do not rely on it as a permanent corp domain.
 *
 * Single source of truth for the corp/private distinction:
 *  - Server: inviteUser() guards on it and throws PRIVATE_EMAIL_BLOCKED.
 *  - Client: the detail-modal invite footer + the "Nur Privat-Email" filter pill
 *    use it WITHOUT a server round-trip.
 *
 * Pure + dependency-free (no "server-only", no DOM) → importable from both the
 * server-only data layer (users.ts) and Client Components.
 */
export const CORP_EMAIL_PATTERN = /@(airtuerk\.de|airtuerkholidays\.de|airtuerk\.online)$/i;

/** True if `email` is a company address (see CORP_EMAIL_PATTERN for the domains). */
export function isCorpEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return CORP_EMAIL_PATTERN.test(email.trim().toLowerCase());
}

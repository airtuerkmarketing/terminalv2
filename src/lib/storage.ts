/**
 * Public Supabase Storage URL builders. Env-driven (NEXT_PUBLIC_SUPABASE_URL),
 * so the same code points at the live project in every environment. Pure string
 * builders — safe to call from server or client components.
 *
 * `imageUrl` mirrors the helper in email-tools.ts (kept there for the generator
 * tools); this module is the canonical home for storage URLs used outside the
 * email tools (e.g. the brand-sections content).
 */
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public`;

/** Public URL for an asset in the `images` bucket. */
export function imageUrl(path: string): string {
  return `${STORAGE_BASE}/images/${path}`;
}

/** Public URL for a file in the `documents` bucket. */
export function documentUrl(path: string): string {
  return `${STORAGE_BASE}/documents/${path}`;
}

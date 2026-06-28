import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free, session-less Supabase client using the public anon key.
 *
 * Deterministic — it reads no per-request cookies/headers — so it CAN run inside
 * `unstable_cache`, unlike the cookie-bound server client (`@/lib/supabase/server`).
 * RLS still applies as the `anon` role: published `pages`/`blocks`, public
 * `brands`/`assets`. Use ONLY for cacheable PUBLIC (published) reads — never for
 * viewer-specific or privileged data, and never to bypass RLS (that's admin.ts).
 *
 * The anon key is already `NEXT_PUBLIC_*` (exposed to the browser bundle), so this
 * leaks no secret; `server-only` keeps it on the server where the cache lives.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

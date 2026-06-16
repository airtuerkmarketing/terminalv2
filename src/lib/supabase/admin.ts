import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER-ONLY.
 *
 * Uses SUPABASE_SECRET_KEY and BYPASSES Row Level Security — never import this
 * from a Client Component. (Next.js only exposes NEXT_PUBLIC_* env vars to the
 * browser bundle, so the secret cannot leak client-side, but treat it as
 * privileged regardless.)
 *
 * Used for draft-aware reads during development: the `pages`/`blocks` RLS only
 * exposes published rows to the public role, and all content is currently draft,
 * so the frontend would 404 everywhere. See src/lib/pages.ts (SHOW_DRAFTS).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

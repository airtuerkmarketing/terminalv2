-- ─────────────────────────────────────────────────────────────────────────────
-- last_sign_in_for(ids) — bounded service-role lookup of auth.users.last_sign_in_at
-- (review/optimizer finding O4).
--
-- Replaces the GoTrue admin `listUsers` pager that fetchLastSignInMap() used to
-- page up to 50× (pulling the entire auth.users object graph) to enrich ≤63 panel
-- rows. The auth schema is NOT exposed to PostgREST, so a direct table SELECT is
-- impossible from the client — this SECURITY DEFINER RPC does a single bounded
-- SELECT keyed on the linked profile ids and returns only (id, last_sign_in_at).
--
-- SECURITY DEFINER (owner = postgres) so it can read auth.users; SET search_path
-- per house SECDEF style; auth.users is fully qualified. EXECUTE is granted to
-- service_role ONLY (the admin client) and revoked from anon/authenticated/public —
-- last_sign_in_at must not leak to the RLS client (matches the existing rule that
-- only the service role reads auth.users; see src/lib/users.ts fetchLastSignInMap).
-- Idempotent (CREATE OR REPLACE + idempotent GRANT/REVOKE).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.last_sign_in_for(ids uuid[])
RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT u.id, u.last_sign_in_at
  FROM auth.users u
  WHERE u.id = ANY(ids);
$$;

REVOKE ALL ON FUNCTION public.last_sign_in_for(uuid[]) FROM public;
REVOKE ALL ON FUNCTION public.last_sign_in_for(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.last_sign_in_for(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.last_sign_in_for(uuid[]) TO service_role;

-- Registry note: register version 20260628130001 in
-- supabase_migrations.schema_migrations (matching version). Prod write needs
-- explicit owner sign-off. Verify ledger parity by hashing the sorted version set.

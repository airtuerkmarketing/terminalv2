import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh helper called from proxy.ts.
 *
 * In Next.js 16, proxy.ts should be a "thin proxy" — only cookie/session
 * refresh, no auth-gating logic. Auth checks happen in Server Components
 * (layouts and pages) where we can do them more securely.
 *
 * This function:
 *   1. Reads cookies from the incoming request
 *   2. Creates a Supabase client wired to those cookies
 *   3. Calls supabase.auth.getUser() to refresh the session if needed
 *   4. Writes refreshed cookies back onto the response
 *   5. Returns the response (with updated Set-Cookie headers)
 *
 * Returns a NextResponse with fresh cookies. The actual /admin gate is in
 * src/app/(admin)/layout.tsx via a redirect() call.
 */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session silently. We don't make routing decisions here.
  await supabase.auth.getUser();

  return response;
}
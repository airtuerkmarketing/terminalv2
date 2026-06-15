import { refreshSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 proxy — only refreshes the Supabase session cookie.
 * Auth-gating happens inside (admin)/layout.tsx for better security
 * (per CVE-2025-29927 guidance).
 */
export async function proxy(request: NextRequest) {
  return await refreshSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
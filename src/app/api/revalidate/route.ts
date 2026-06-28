import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";

/**
 * Manual cache-bust lever for the CMS read cache (PERF-02).
 *
 * The public page/block/brand-section reads are cached (unstable_cache, 1h TTL —
 * see src/lib/pages.ts). There is no in-app publish UI yet, so content changes
 * land via SQL/migration and have no automatic revalidation hook. Until a CMS
 * publish flow exists, a super_admin can POST here to drop the whole `pages:all`
 * tag immediately (e.g. after editing content in the DB):
 *
 *   curl -X POST https://www.airtuerk.dev/api/revalidate   (with a super_admin session)
 *
 * super_admin-only; no body required.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  // Next 16: revalidateTag requires a cache-life profile as the 2nd arg in route
  // handlers ("max" = drop now); updateTag is Server-Action-only.
  revalidateTag("pages:all", "max");
  return NextResponse.json({ ok: true, revalidated: "pages:all" });
}

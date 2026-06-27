import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INLINE_PREVIEW_EXT } from "@/lib/documents-constants";

/**
 * Gated signed-URL serving for the PRIVATE `library` bucket (D-052).
 *
 * The file row is fetched with the request-scoped client, so RLS returns it
 * ONLY when the viewer may see it (folder is_public OR is_admin()). If RLS
 * blocks it, the row is absent → 404 (a leaked link to a non-public file is
 * indistinguishable from a missing one). When allowed, the service-role client
 * mints a short-TTL signed URL and we 302-redirect to it. Images + PDFs open
 * inline (preview); everything else (and ?download=1) downloads.
 *
 * Because the bucket is private and every fetch is gated here, toggling a
 * folder's visibility is a pure metadata flip — no object moves — and the later
 * login gate is a one-clause change in the RLS SELECT policy.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // RLS gate: this row is returned only if the viewer may see its folder.
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("document_files")
    .select("id, title, extension, storage_path")
    .eq("id", id)
    .is("deleted_at", null) // trashed files aren't servable via a direct URL (D-076)
    .maybeSingle();

  if (!file || !file.storage_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = (file.extension as string) ?? "";
  const forceDownload =
    req.nextUrl.searchParams.has("download") || !INLINE_PREVIEW_EXT.has(ext);

  // Safe download filename: <title>.<ext>, stripped of path/quote characters.
  const safeTitle =
    String(file.title ?? "file").replace(/[\\/:*?"<>|]+/g, "_").trim() || "file";
  const downloadName = ext ? `${safeTitle}.${ext}` : safeTitle;

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("library")
    .createSignedUrl(file.storage_path as string, SIGNED_TTL_SECONDS, {
      download: forceDownload ? downloadName : undefined,
    });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not sign file" }, { status: 502 });
  }

  // Never let a browser/CDN cache the redirect: the signed URL is short-lived
  // and per-viewer; a cached 302 would replay it past the per-request RLS gate.
  const res = NextResponse.redirect(signed.signedUrl, { status: 302 });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

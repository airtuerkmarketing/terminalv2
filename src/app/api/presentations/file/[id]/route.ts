import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INLINE_PREVIEW_EXT } from "@/lib/presentations-constants";

/**
 * Gated signed-URL serving for the PRIVATE `presentations` bucket (migration 0033).
 *
 * The file row is fetched with the request-scoped client, so RLS returns it ONLY
 * when the viewer may see it (login-only hub → any authenticated user; anon → no
 * row → 404). When allowed, the service-role client mints a short-TTL signed URL
 * and we 302-redirect to it.
 *
 * One route serves three asset kinds, all gated by the same row read and all
 * addressed WITHOUT a client-supplied path (→ no path injection):
 *   • (default)        → storage_path (source). Inline for pdf/images, else download.
 *   • ?asset=thumb     → thumbnail_path (the cover WebP).
 *   • ?asset=slide&i=N → slide_paths[N] (N validated against the array length).
 * The thumb/slide branches 404 until the Stufe-3 pipeline fills those columns.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "presentations";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // RLS gate: this row is returned only if the viewer may see it.
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("presentation_files")
    .select("id, title, file_type, storage_path, thumbnail_path, slide_paths")
    .eq("id", id)
    .is("deleted_at", null) // trashed files aren't servable via a direct URL (D-078)
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = req.nextUrl.searchParams.get("asset");
  let path: string | null;
  let downloadName: string | undefined;

  if (asset === "thumb") {
    path = (file.thumbnail_path as string | null) ?? null;
  } else if (asset === "slide") {
    const i = Number(req.nextUrl.searchParams.get("i"));
    const slides = (file.slide_paths as string[] | null) ?? [];
    path = Number.isInteger(i) && i >= 0 && i < slides.length ? slides[i] : null;
  } else {
    path = (file.storage_path as string | null) ?? null;
    const ext = (file.file_type as string) ?? "";
    const forceDownload = req.nextUrl.searchParams.has("download") || !INLINE_PREVIEW_EXT.has(ext);
    if (forceDownload) {
      const safeTitle =
        String(file.title ?? "file").replace(/[\\/:*?"<>|]+/g, "_").trim() || "file";
      downloadName = ext ? `${safeTitle}.${ext}` : safeTitle;
    }
  }

  if (!path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS, { download: downloadName });
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not sign file" }, { status: 502 });
  }

  // Never cache the redirect: the signed URL is short-lived and per-viewer.
  const res = NextResponse.redirect(signed.signedUrl, { status: 302 });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

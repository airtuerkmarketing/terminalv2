import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * V1 (Strategy C) thumbnail generation — IMAGE uploads only.
 *
 * JPG/JPEG/PNG/WebP get a real cover thumbnail via sharp (640px wide WebP,
 * quality 80). PDF/PPT/PPTX/PPS/PPSX are deliberately NOT handled here: a
 * synchronous slide pipeline inside Vercel functions proved unstable
 * (2026-06-21 — bleeding-edge Node polyfill issues + a Path2D/@napi-rs/canvas
 * type mismatch), so it is deferred to V1.1 as background jobs (Supabase Edge
 * Functions or an external API like CloudConvert). Until then the UI (stage 4)
 * shows a type icon for non-image files.
 *
 * NON-FATAL by contract: every failure path returns { ok: false, error } — this
 * function NEVER throws, so a thumbnail failure can never break an upload.
 *
 * sharp is imported DYNAMICALLY (not a top-level import): this module is pulled
 * into the actions.ts "use server" graph, and a static `import sharp` would make
 * EVERY action (createFolder, move, delete, PDF upload — none of which touch
 * sharp) eager-load the native binary at lambda init and 500 if it can't load.
 * Deferring the import to call-time keeps non-image actions completely free of
 * sharp; a broken native binary then only fails thumbnail generation, caught by
 * the try/catch below (still non-fatal). `serverExternalPackages: ["sharp"]`
 * keeps it external for the dynamic import too.
 */
const BUCKET = "presentations";
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"] as const;
type ImageExt = (typeof IMAGE_EXTS)[number];

export async function generateImageThumbnail(
  fileId: string,
  sourceBuffer: Buffer,
  ext: ImageExt
): Promise<{ ok: true; thumbnailPath: string } | { ok: false; error: string }> {
  // Defensive: only image extensions are ever rendered to a thumbnail.
  if (!IMAGE_EXTS.includes(ext)) {
    return { ok: false, error: `unsupported ext: ${ext}` };
  }

  const thumbnailPath = `${fileId}/thumbnail.webp`;

  try {
    const sharp = (await import("sharp")).default;
    // resize → max 640px wide, no crop, no upscale; re-encode as WebP q80.
    const webp = await sharp(sourceBuffer)
      .resize({ width: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const admin = createAdminClient();

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(thumbnailPath, webp, { contentType: "image/webp", upsert: true });
    if (upErr) return { ok: false, error: upErr.message };

    const { error: dbErr } = await admin
      .from("presentation_files")
      .update({
        thumbnail_path: thumbnailPath,
        slide_count: 1,
        slide_paths: [thumbnailPath],
      })
      .eq("id", fileId);
    if (dbErr) return { ok: false, error: dbErr.message };

    return { ok: true, thumbnailPath };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

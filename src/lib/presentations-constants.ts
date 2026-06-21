/**
 * Presentation Hub shared constants + helpers.
 *
 * Plain module — NO `server-only` — so both client components (upload/edit
 * modals, validation) and server code (upload action, serving route) import it.
 * Keep this free of any server-only imports.
 *
 * Self-contained BY DESIGN: own copies of slugify/LANGUAGES/normalizeLanguage/
 * extFromFilename/formatBytes — NO import from documents-constants — so the
 * Presentation Hub and the Document Library stay fully decoupled (a change to one
 * can never affect the other). These are pure, stateless helpers; the small
 * duplication is the deliberate cost of that separation.
 */

/** Hard upload ceiling — mirrors the `presentations` bucket's file_size_limit (25 MB, migration 0033). */
export const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Allowed extension → canonical MIME. The upload action validates by EXTENSION
 * first (browsers often send application/octet-stream for Office files), then
 * sets the storage contentType from this map so the declared type always matches
 * the bucket allowlist (a strict SUBSET of bucket allowed_mime_types).
 */
export const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pps: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const ALLOWED_EXT = new Set(Object.keys(EXT_TO_MIME));

/**
 * `accept` value for file inputs — EXTENSIONS, not MIME types. A MIME-only accept
 * greys out .pps/.ppsx in the OS picker (browsers report Office files as
 * application/octet-stream). Validation is also extension-based (never file.type);
 * the server sets contentType from EXT_TO_MIME.
 */
export const ACCEPT_ATTR = Object.keys(EXT_TO_MIME)
  .map((e) => `.${e}`)
  .join(",");

/** Human-readable accept hint for the upload dropzone. */
export const ACCEPT_HINT = "PDF, PowerPoint, Bilder — max 25 MB";

/** Extensions that open inline in a new tab (preview); everything else downloads. */
export const INLINE_PREVIEW_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);

/**
 * Extensions the Stufe-3 pipeline can extract slide images from (→ slide_paths,
 * browser player, hover-cycling). PPT/PPS/PPTX/PPSX are DOWNLOAD-ONLY in V1
 * (Variante A: no LibreOffice / external conversion) — they get no slides and the
 * player falls back to download.
 */
export const SLIDE_EXTRACTABLE_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);

/** Supported languages for the multilingual variant model (matches the DB CHECK). */
export const LANGUAGES = [
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "en", label: "EN", name: "English" },
  { code: "tr", label: "TR", name: "Türkçe" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];
const LANGUAGE_CODES = new Set<string>(LANGUAGES.map((l) => l.code));

/** Normalize a free-form language value to a supported code, or null. */
export function normalizeLanguage(v: string | null | undefined): LanguageCode | null {
  if (!v) return null;
  const c = v.trim().toLowerCase().slice(0, 2);
  return LANGUAGE_CODES.has(c) ? (c as LanguageCode) : null;
}

/** Presentation-type badge buckets (semantic; styled via tokens later). */
export type PresentationKind = "pdf" | "ppt" | "image";

export function presentationKind(ext: string): PresentationKind {
  switch (ext) {
    case "pdf":
      return "pdf";
    case "ppt":
    case "pps":
    case "pptx":
    case "ppsx":
      return "ppt";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "image";
    default:
      return "pdf"; // unreachable: ext is validated upstream
  }
}

/** Short uppercase badge label (the actual extension, e.g. "PPTX", "PDF"). */
export function presentationKindLabel(ext: string): string {
  return (ext || "file").toUpperCase();
}

/** Lowercased, dot-stripped extension from a filename ("" if none). */
export function extFromFilename(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec((name ?? "").trim());
  return m ? m[1].toLowerCase() : "";
}

/** True if the extension is in the upload allowlist. */
export function isAllowedExt(ext: string): boolean {
  return ALLOWED_EXT.has(ext);
}

/**
 * Slugify a folder name to a single URL segment. Transliterates German umlauts/ß,
 * strips remaining diacritics, lowercases, collapses to single hyphens. Output
 * matches the DB CHECK `^[a-z0-9]+(?:-[a-z0-9]+)*$` — or "" when the name has no
 * usable characters (callers must treat "" as invalid).
 */
export function slugify(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents (é→e, ç→c, …)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** Format a byte count as a compact human string ("2.7 MB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

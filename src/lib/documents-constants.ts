/**
 * Document Library shared constants + helpers (File System v2).
 *
 * Plain module — NO `server-only` — so both client components (upload/edit
 * modals, validation) and server code (upload action, serving route) import it.
 * Keep this free of any server-only imports.
 */

/** Hard upload ceiling — mirrors the `library` bucket's file_size_limit (15 MB). */
export const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Allowed extension → canonical MIME. The upload action validates by EXTENSION
 * first (browsers often send application/octet-stream for Office files), then
 * sets the storage contentType from this map so the declared type always
 * matches the bucket allowlist.
 */
export const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pps: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  zip: "application/zip",
};

export const ALLOWED_EXT = new Set(Object.keys(EXT_TO_MIME));

/**
 * `accept` value for file inputs — EXTENSIONS, not MIME types. A MIME-only accept
 * greys out .docx/.pps in the OS picker (browsers report Office files as
 * application/octet-stream), which looks like "nothing happens". Validation is
 * also extension-based (never file.type); the server sets contentType from
 * EXT_TO_MIME.
 */
export const ACCEPT_ATTR = Object.keys(EXT_TO_MIME)
  .map((e) => `.${e}`)
  .join(",");
/** Backstop set (the bucket allowlist also accepts the zip alias). */
export const ALLOWED_MIME = new Set(
  Object.values(EXT_TO_MIME).concat("application/x-zip-compressed")
);

/** Human-readable accept hint for the upload dropzone. */
export const ACCEPT_HINT = "PDF, Word, Excel, PowerPoint, images, TXT, CSV, ZIP — max 15 MB";

/** Supported languages for the multilingual variant model (matches the DB CHECK). */
export const LANGUAGES = [
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "en", label: "EN", name: "English" },
  { code: "tr", label: "TR", name: "Türkçe" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];
const LANGUAGE_CODES = new Set<string>(LANGUAGES.map((l) => l.code));

/** Unicode flag emoji for a language code (en→🇬🇧). Null for unset/unknown. */
export function languageFlag(language: string | null | undefined): string | null {
  if (!language) return null;
  const flags: Record<string, string> = {
    de: "🇩🇪",
    en: "🇬🇧",
    tr: "🇹🇷",
  };
  return flags[language] ?? null;
}

/** Normalize a free-form language value to a supported code, or null. */
export function normalizeLanguage(v: string | null | undefined): LanguageCode | null {
  if (!v) return null;
  const c = v.trim().toLowerCase().slice(0, 2);
  return LANGUAGE_CODES.has(c) ? (c as LanguageCode) : null;
}

/** File-type badge buckets (semantic; styled via --ft-* tokens). */
export type FileKind = "pdf" | "word" | "excel" | "ppt" | "image" | "txt" | "zip" | "file";

export function fileKind(ext: string): FileKind {
  switch (ext) {
    case "pdf":
      return "pdf";
    case "doc":
    case "docx":
      return "word";
    case "xls":
    case "xlsx":
    case "csv":
      return "excel";
    case "ppt":
    case "pps":
    case "pptx":
    case "ppsx":
      return "ppt";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return "image";
    case "txt":
      return "txt";
    case "zip":
      return "zip";
    default:
      return "file";
  }
}

/** Short uppercase badge label for a file kind. */
export function fileKindLabel(ext: string): string {
  const k = fileKind(ext);
  return k === "file" ? (ext ? ext.toUpperCase() : "FILE") : k.toUpperCase();
}

/** Extensions that open inline in a new tab (preview); everything else downloads. */
export const INLINE_PREVIEW_EXT = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp"]);

/** Lowercased, dot-stripped extension from a filename ("" if none). */
export function extFromFilename(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec((name ?? "").trim());
  return m ? m[1].toLowerCase() : "";
}

/**
 * Slugify a folder name to a single URL segment. Transliterates German
 * umlauts/ß, strips remaining diacritics, lowercases, and collapses everything
 * else to single hyphens. Output matches the DB CHECK
 * `^[a-z0-9]+(?:-[a-z0-9]+)*$` — or "" when the name has no usable characters
 * (callers must treat "" as an invalid name).
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
    .slice(0, 80) // cap path-segment length
    .replace(/-+$/, ""); // re-trim any hyphen the slice introduced
}

/** True if the extension is in the upload allowlist. */
export function isAllowedExt(ext: string): boolean {
  return ALLOWED_EXT.has(ext);
}

/** Format a byte count as a compact human string ("2.7 MB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

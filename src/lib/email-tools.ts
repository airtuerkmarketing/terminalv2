/**
 * Shared helpers for the email-signature (Task 5b) and out-of-office (Task 5c)
 * generators. Browser-only at call time (clipboard/DOM); safe to import from
 * client components.
 */

/** HTML-escape a user-entered string for safe interpolation into markup. */
export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Public URL for an asset in the Supabase `images` storage bucket. */
export function imageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/images/${path}`;
}

/**
 * Copy formatted HTML (with a plain-text alternative) to the clipboard so it
 * pastes as a rich signature into Outlook/Gmail. Uses the async Clipboard API
 * with a contentEditable + execCommand fallback. Resolves true on success.
 */
export async function copyRichText(html: string, plain: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // fall through to the execCommand fallback
    }
  }
  return fallbackCopyHtml(html);
}

function fallbackCopyHtml(html: string): boolean {
  if (typeof document === "undefined") return false;
  const tmp = document.createElement("div");
  tmp.contentEditable = "true";
  tmp.innerHTML = html;
  tmp.style.position = "fixed";
  tmp.style.left = "-9999px";
  document.body.appendChild(tmp);
  const range = document.createRange();
  range.selectNodeContents(tmp);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  sel?.removeAllRanges();
  document.body.removeChild(tmp);
  return ok;
}

/** Copy plain text to the clipboard (Clipboard API + textarea fallback). */
export async function copyPlainText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }
  if (typeof document === "undefined") return false;
  const t = document.createElement("textarea");
  t.value = text;
  t.style.position = "fixed";
  t.style.left = "-9999px";
  document.body.appendChild(t);
  t.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(t);
  return ok;
}

import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Shared helpers for the Document Library + Presentation Hub server actions.
 *
 * These were duplicated verbatim across documents-library/actions.ts and
 * presentation-hub/actions.ts (CM-02). NOT a "use server" module — it exports
 * plain helpers, imported by the two "use server" action files.
 */

/** UUID validation for folder/file ids coming off the wire. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map thrown auth errors + Postgres error codes to friendly messages. */
export function toMessage(e: unknown, ctx: "folder" | "file" | "generic" = "generic"): string {
  const err = e as { message?: string; code?: string } | null;
  const msg = err?.message ?? String(e);
  if (msg === "NOT_AUTHENTICATED") return "Please sign in to do that.";
  if (msg === "NOT_AUTHORIZED") return "You don't have permission to do that.";
  if (/cycle/i.test(msg)) return "You can't move a folder into itself or one of its subfolders.";
  if (err?.code === "23505")
    return ctx === "folder"
      ? "A folder with that name already exists here."
      : "That item already exists.";
  if (err?.code === "23503") return "That destination no longer exists.";
  if (err?.code === "23514") return "That value isn't allowed.";
  if (err?.code === "42P01" || err?.code === "PGRST205" || /schema cache/i.test(msg))
    return "Folder permissions aren’t set up yet — apply the latest migration and try again.";
  return "Something went wrong. Please try again.";
}

/**
 * Folder STRUCTURE changes the shared sidebar (rendered in the public root
 * layout), so the whole tree must be revalidated.
 */
export function revalidateStructure() {
  revalidatePath("/", "layout");
}

/** File-only changes affect just the given library's pages (e.g. "/documents-library"). */
export function revalidateLibraryFiles(basePath: string) {
  revalidatePath(basePath, "layout");
}

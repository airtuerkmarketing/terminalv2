// D-110: shared client helper for the AI-attach feature. BOTH the dashboard SearchAIBox
// and the AIChatWindow composer consume this so the (non-trivial) async read/validate/
// extract logic stays byte-identical across the two surfaces — the drift hazard CLAUDE.md
// warns about. mammoth is dynamic-imported (~180KB gzip; its package `browser` field swaps
// the Node-only unzip/files modules for browser builds) so it loads only on the first DOCX
// pick and stays out of the dashboard's initial JS bundle.
import type { RagQueryOptions } from "@/lib/rag/client";
import { extFromFilename, formatBytes } from "@/lib/documents-constants";

/** The attachment payload sent to rag-query — single source of truth is RagQueryOptions
 *  (re-derived so the client and server agree on one shape). */
export type AttachedFile = NonNullable<RagQueryOptions["attachedFile"]>;

/** V1 scope: one PDF or DOCX. Deliberately distinct from documents-constants
 *  (library bucket: 15 MB, many types) — attachments cap at 10 MB and PDF/DOCX only. */
export const ATTACH_ALLOWED_EXT = new Set(["pdf", "docx"]);
export const ATTACH_ACCEPT = ".pdf,.docx";
export const ATTACH_MAX_BYTES = 10 * 1024 * 1024; // 10 MB source -> ~13.3 MB base64 (spike-verified OK)

/** Post-attach quick-action pills (D-110). EN labels (match the hero surface). Each pill
 *  submits its `prompt` with the attached file on mode 'default', so the server attach
 *  branch handles it — arming a RAG_BYPASS mode would silently drop the file. */
export const ATTACH_QUICK_ACTIONS: ReadonlyArray<{ label: string; prompt: string }> = [
  { label: "Summarize", prompt: "Summarize this document." },
  { label: "Translate EN", prompt: "Translate this document to English." },
  { label: "Key Points", prompt: "Extract the key points from this document as a concise bulleted list." },
];

type ReadResult = { ok: true; file: AttachedFile } | { ok: false; error: string };

/**
 * Read + validate a picked File into an AttachedFile. PDF -> newline-free base64 (sent as a
 * document block); DOCX -> plain text via mammoth (prepended to the question server-side).
 * Returns friendly, user-facing error strings (English — matches the hero surface) instead
 * of throwing, so the caller just renders `error`.
 */
export async function readAttachment(file: File): Promise<ReadResult> {
  const ext = extFromFilename(file.name);
  if (!ATTACH_ALLOWED_EXT.has(ext)) {
    return { ok: false, error: "PDF or DOCX only." };
  }
  if (file.size > ATTACH_MAX_BYTES) {
    return { ok: false, error: "File too large — max 10 MB." };
  }

  if (ext === "pdf") {
    try {
      const contentBase64 = await readAsBase64(file);
      // Anthropic requires newline-free base64; FileReader.readAsDataURL yields exactly that.
      if (!contentBase64 || !/^[A-Za-z0-9+/]+=*$/.test(contentBase64)) {
        return { ok: false, error: "Couldn't read this PDF." };
      }
      return {
        ok: true,
        file: { kind: "pdf", filename: file.name, contentBase64, sizeBytes: file.size },
      };
    } catch {
      return { ok: false, error: "Couldn't read this PDF." };
    }
  }

  // docx: client-side text extraction. mammoth can throw on a corrupt/encrypted file or a
  // renamed .doc (OLE2) — and can succeed with empty text; treat both as a failure.
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result?.value ?? "").trim();
    if (!text) {
      return { ok: false, error: "Couldn't extract text from this document." };
    }
    return {
      ok: true,
      file: { kind: "docx-text", filename: file.name, contentText: text, sizeBytes: file.size },
    };
  } catch {
    return { ok: false, error: "Couldn't read this document." };
  }
}

/** data:...;base64,<b64> -> bare base64 (newline-free, per Anthropic's PDF requirement). */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const s = typeof reader.result === "string" ? reader.result : "";
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.readAsDataURL(file);
  });
}

/** Chip display metadata (extension + human size), identical across both surfaces. */
export function attachmentChipMeta(f: AttachedFile): { ext: string; size: string } {
  return { ext: extFromFilename(f.filename), size: formatBytes(f.sizeBytes) };
}

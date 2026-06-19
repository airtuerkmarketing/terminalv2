// supabase/functions/confluence-extract-text/index.ts
//
// PDF/XLSX text extraction — etappe 1b, phase 4.
// Pulls text-relevant attachments (already in the confluence-attachments
// bucket) that still have extracted_text = NULL, extracts their text, and
// writes it back. Idempotent + batched: each call processes up to `limit`
// rows where extracted_text IS NULL, so repeated calls drain the backlog
// without hitting the edge-function wall-clock.
//
// PDF  → unpdf (Deno/serverless-native pdf.js wrapper)
// XLSX → SheetJS (sheet_to_csv per sheet)
//
// Query params: ?limit=N (default 12). Returns per-file result + remaining.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const BUCKET = "confluence-attachments";
const MAX_CHARS = 500_000; // safety cap per attachment

function isXlsx(mime: string): boolean {
  return mime.includes("spreadsheetml") || mime.includes("ms-excel");
}
function isPdf(mime: string): boolean {
  return mime.includes("pdf");
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (typeof text === "string" ? text : (text as string[]).join("\n")).slice(0, MAX_CHARS);
}

function extractXlsx(bytes: Uint8Array): string {
  const wb = XLSX.read(bytes, { type: "array" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    if (csv.trim()) parts.push(`## Sheet: ${name}\n${csv}`);
  }
  return parts.join("\n\n").slice(0, MAX_CHARS);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "12") || 12, 40);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL or service key missing" }),
      { status: 500, headers: { "content-type": "application/json" } });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const report: any = {
    started_at: new Date().toISOString(), limit,
    processed: 0, succeeded: 0, failed: 0,
    results: [] as any[], remaining: null as number | null,
  };

  // Fetch a batch of pending text-relevant attachments.
  const { data: rows, error: selErr } = await supabase
    .from("confluence_attachments")
    .select("attachment_id, page_id, filename, media_type, storage_path")
    .eq("is_text_relevant", true)
    .is("extracted_text", null)
    .not("storage_path", "is", null)
    .limit(limit);

  if (selErr) {
    report.errors = [`select: ${selErr.message}`];
    return new Response(JSON.stringify(report, null, 2),
      { status: 500, headers: { "content-type": "application/json" } });
  }

  for (const row of rows ?? []) {
    report.processed++;
    const r: any = { attachment_id: row.attachment_id, filename: row.filename, ok: false };
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(row.storage_path);
      if (dlErr || !blob) throw new Error(`download: ${dlErr?.message ?? "no blob"}`);
      const bytes = new Uint8Array(await blob.arrayBuffer());

      let text = "";
      if (isPdf(row.media_type)) text = await extractPdf(bytes);
      else if (isXlsx(row.media_type)) text = extractXlsx(bytes);
      else throw new Error(`unsupported media_type ${row.media_type}`);

      // Write back. Empty extraction (e.g. scanned PDF) → sentinel so we don't
      // re-process it forever; record it as ocr_needed in the report.
      const finalText = text && text.trim().length > 0 ? text : "[NO_TEXT_EXTRACTED]";
      const { error: upErr } = await supabase
        .from("confluence_attachments")
        .update({ extracted_text: finalText })
        .eq("attachment_id", row.attachment_id);
      if (upErr) throw new Error(`update: ${upErr.message}`);

      r.ok = true;
      r.chars = finalText === "[NO_TEXT_EXTRACTED]" ? 0 : finalText.length;
      if (r.chars === 0) r.note = "ocr_needed (no extractable text)";
      report.succeeded++;
    } catch (e) {
      r.error = (e as Error).message;
      report.failed++;
    }
    report.results.push(r);
  }

  // How many still pending after this batch?
  const { count } = await supabase
    .from("confluence_attachments")
    .select("attachment_id", { count: "exact", head: true })
    .eq("is_text_relevant", true)
    .is("extracted_text", null)
    .not("storage_path", "is", null);
  report.remaining = count ?? null;

  report.finished_at = new Date().toISOString();
  return new Response(JSON.stringify(report, null, 2), {
    status: 200, headers: { "content-type": "application/json" },
  });
});

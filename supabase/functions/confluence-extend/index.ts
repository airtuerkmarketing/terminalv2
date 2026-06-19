// supabase/functions/confluence-extend/index.ts
//
// Confluence targeted extend — etappe 1b.
// Loads exactly THREE specific pages with the same field quality as the
// snapshot (storage + view + restrictions + history + comments + attachments),
// tagging each with a `bereich`:
//   1. Operativ FAQ      (444009709)  → bereich=faq
//   2. Operativ Support  (1015316537) → bereich=support
//   3. Airline Kontakte  (16165417)   → bereich=aerconso   [single AERCONSO page]
//
// It does NOT scan the AERCONSO space, NEWS, blogs or team pages.
// The old embed placeholder row (446989123) is updated to point at 16165417.
//
// Token: edge-function vault secret ATLASIAN (single S). Never logged.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CONFLUENCE_BASE  = "https://aerticket.atlassian.net";
const CONFLUENCE_EMAIL = "bdemir@airtuerk.de";
const THROTTLE_MS = 100;
const EMBED_PLACEHOLDER_ID = "446989123";

const TEXT_RELEVANT_MIME = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
]);

// Fixed targets — id, bereich, space_key.
const TARGETS = [
  { id: "444009709",  bereich: "faq",      space_key: "WikiOperativ" },
  { id: "1015316537", bereich: "support",  space_key: "WikiOperativ" },
  { id: "16165417",   bereich: "aerconso", space_key: "AERCONSO" },
];

function authHeader(): string {
  const token = Deno.env.get("ATLASIAN");
  if (!token) throw new Error("Vault secret ATLASIAN is missing in this edge function environment");
  return `Basic ${btoa(`${CONFLUENCE_EMAIL}:${token}`)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function confluenceFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${CONFLUENCE_BASE}${path}`;
  let attempt = 0;
  while (true) {
    await sleep(THROTTLE_MS);
    const res = await fetch(url, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: authHeader(), Accept: "application/json" },
    });
    if (res.status !== 429) return res;
    attempt++;
    if (attempt > 5) return res;
    const retryAfter = Number(res.headers.get("Retry-After")) || 0;
    const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(2000 * Math.pow(2, attempt), 30_000);
    await sleep(backoff);
  }
}

async function confluenceJson<T = any>(path: string): Promise<T> {
  const res = await confluenceFetch(path);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Confluence ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function paginateV2<T = any>(path: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = path;
  while (next) {
    const data: { results: T[]; _links?: { next?: string } } = await confluenceJson(next);
    if (Array.isArray(data.results)) out.push(...data.results);
    next = data._links?.next ?? null;
  }
  return out;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}

function safeStoragePath(pageId: string, attId: string, filename: string): string {
  const cleaned = filename.normalize("NFKD").replace(/[^\w\.\-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "file";
  return `${pageId}/${attId}_${cleaned}`;
}

type PageReport = {
  page_id: string; title: string; bereich: string; char_count: number;
  restricted: boolean; comments: number;
  attachments_total: number; attachments_uploaded: number; errors: string[];
};

async function snapshotComments(pageId: string, type: "footer" | "inline", supabase: any, rep: PageReport) {
  const path = type === "footer"
    ? `/wiki/api/v2/pages/${pageId}/footer-comments?limit=100&body-format=storage`
    : `/wiki/api/v2/pages/${pageId}/inline-comments?limit=100&body-format=storage`;
  let comments: any[] = [];
  try { comments = await paginateV2(path); }
  catch (e) { rep.errors.push(`${type}-comments: ${(e as Error).message}`); return; }
  for (const c of comments) {
    const cBody = c.body?.storage?.value ?? "";
    const { error } = await supabase.from("confluence_comments").upsert({
      comment_id: String(c.id), page_id: pageId, author: c.authorId ?? "",
      body_text: stripHtml(cBody), created_at: c.version?.createdAt ?? null,
      comment_type: type, snapshot_at: new Date().toISOString(),
    }, { onConflict: "comment_id" });
    if (error) rep.errors.push(`comment ${c.id}: ${error.message}`); else rep.comments++;
  }
}

async function snapshotAttachments(pageId: string, supabase: any, rep: PageReport) {
  let attachments: any[] = [];
  try { attachments = await paginateV2(`/wiki/api/v2/pages/${pageId}/attachments?limit=100`); }
  catch (e) { rep.errors.push(`attachments-list: ${(e as Error).message}`); return; }
  rep.attachments_total = attachments.length;
  for (const att of attachments) {
    const id = String(att.id);
    const mediaType = att.mediaType ?? att.mimeType ?? "";
    const textRelevant = TEXT_RELEVANT_MIME.has(mediaType);
    const filename: string = att.title ?? "file";
    const downloadUrl: string | null = att.downloadLink ? `${CONFLUENCE_BASE}/wiki${att.downloadLink}` : null;
    let storagePath: string | null = null;
    if (textRelevant && downloadUrl) {
      try {
        const dlRes = await confluenceFetch(downloadUrl);
        if (dlRes.ok) {
          const bytes = new Uint8Array(await dlRes.arrayBuffer());
          storagePath = safeStoragePath(pageId, id, filename);
          const { error: stErr } = await supabase.storage.from("confluence-attachments")
            .upload(storagePath, bytes, { contentType: mediaType || "application/octet-stream", upsert: true });
          if (stErr) { rep.errors.push(`upload ${id}: ${stErr.message}`); storagePath = null; }
          else rep.attachments_uploaded++;
        } else rep.errors.push(`download ${id}: HTTP ${dlRes.status}`);
      } catch (e) { rep.errors.push(`download ${id}: ${(e as Error).message}`); }
    }
    const { error: insErr } = await supabase.from("confluence_attachments").upsert({
      attachment_id: id, page_id: pageId, filename, media_type: mediaType,
      file_size: att.fileSize ?? 0, is_text_relevant: textRelevant,
      storage_path: storagePath, extracted_text: null, download_url: downloadUrl,
      snapshot_at: new Date().toISOString(),
    }, { onConflict: "attachment_id" });
    if (insErr) rep.errors.push(`att-row ${id}: ${insErr.message}`);
  }
}

async function snapshotPage(pageId: string, bereich: string, spaceKey: string, supabase: any): Promise<PageReport> {
  const rep: PageReport = {
    page_id: pageId, title: "", bereich, char_count: 0, restricted: false,
    comments: 0, attachments_total: 0, attachments_uploaded: 0, errors: [],
  };

  const pageStorage: any = await confluenceJson(`/wiki/api/v2/pages/${pageId}?body-format=storage`);
  rep.title = pageStorage.title ?? "";
  const bodyStorage: string = pageStorage.body?.storage?.value ?? "";
  rep.char_count = bodyStorage.length;

  let bodyView = "";
  try {
    const pv: any = await confluenceJson(`/wiki/api/v2/pages/${pageId}?body-format=view`);
    bodyView = pv.body?.view?.value ?? "";
  } catch (e) { rep.errors.push(`view: ${(e as Error).message}`); }

  let ancestors: any[] = [];
  try {
    const a: any = await confluenceJson(`/wiki/api/v2/pages/${pageId}/ancestors`);
    ancestors = (a.results ?? []).map((x: any) => ({ id: x.id, title: x.title }));
  } catch (e) { rep.errors.push(`ancestors: ${(e as Error).message}`); }

  let labels: any[] = [];
  try { labels = await paginateV2(`/wiki/api/v2/pages/${pageId}/labels?limit=100`); }
  catch (e) { rep.errors.push(`labels: ${(e as Error).message}`); }

  let restrictions: any = {};
  try {
    restrictions = await confluenceJson(`/wiki/rest/api/content/${pageId}/restriction/byOperation`);
    const r = restrictions?.read?.restrictions, u = restrictions?.update?.restrictions;
    const has = (r?.user?.size ?? 0) + (r?.group?.size ?? 0) + (u?.user?.size ?? 0) + (u?.group?.size ?? 0);
    rep.restricted = has > 0;
  } catch (e) { rep.errors.push(`restrictions: ${(e as Error).message}`); }

  let createdBy = "", createdAt: string | null = null, lastModifiedBy = "";
  let lastModified: string | null = pageStorage.version?.createdAt ?? null;
  const versionNumber: number = pageStorage.version?.number ?? 0;
  try {
    const hist: any = await confluenceJson(`/wiki/rest/api/content/${pageId}?expand=history,history.lastUpdated`);
    createdBy = hist.history?.createdBy?.displayName ?? "";
    createdAt = hist.history?.createdDate ?? null;
    lastModifiedBy = hist.history?.lastUpdated?.by?.displayName ?? "";
    lastModified = hist.history?.lastUpdated?.when ?? lastModified;
  } catch (e) { rep.errors.push(`history: ${(e as Error).message}`); }

  const bodyText = stripHtml(bodyStorage || bodyView);
  const sourceUrl = pageStorage._links?.webui
    ? `${CONFLUENCE_BASE}/wiki${pageStorage._links.webui}`
    : `${CONFLUENCE_BASE}/wiki/spaces/${spaceKey}/pages/${pageId}`;

  const { error: upErr } = await supabase.from("confluence_raw").upsert({
    page_id: pageId, space_key: spaceKey, title: rep.title, kanal: null,
    bereich, page_type: "page", parent_id: ancestors.length ? ancestors[ancestors.length - 1].id : null,
    ancestors, labels, body_storage: bodyStorage, body_view: bodyView, body_text: bodyText,
    char_count: rep.char_count, restrictions, created_by: createdBy, created_at: createdAt,
    version: versionNumber, last_modified: lastModified, last_modified_by: lastModifiedBy,
    snapshot_at: new Date().toISOString(), is_deleted: false, source_url: sourceUrl,
  }, { onConflict: "page_id" });
  if (upErr) rep.errors.push(`upsert page: ${upErr.message}`);

  await snapshotComments(pageId, "footer", supabase, rep);
  await snapshotComments(pageId, "inline", supabase, rep);
  await snapshotAttachments(pageId, supabase, rep);
  return rep;
}

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL or service key missing" }),
      { status: 500, headers: { "content-type": "application/json" } });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const report: any = {
    started_at: new Date().toISOString(), pages: [] as PageReport[],
    totals: { pages: 0, comments: 0, attachments_total: 0, attachments_uploaded: 0 },
    embed_pointer_updated: false, errors: [] as string[],
  };

  for (const t of TARGETS) {
    try {
      const rep = await snapshotPage(t.id, t.bereich, t.space_key, supabase);
      report.pages.push(rep);
      report.totals.pages++;
      report.totals.comments += rep.comments;
      report.totals.attachments_total += rep.attachments_total;
      report.totals.attachments_uploaded += rep.attachments_uploaded;
    } catch (e) {
      report.errors.push(`target ${t.id} (${t.bereich}): ${(e as Error).message}`);
    }
  }

  // Update the old embed placeholder (446989123) to point at the real page.
  try {
    const { error } = await supabase.from("confluence_raw").update({
      body_text: "[Embed] Smart link to AERCONSO. Real content captured under page_id 16165417 (Airline Kontakte).",
      page_type: "embed",
      snapshot_at: new Date().toISOString(),
    }).eq("page_id", EMBED_PLACEHOLDER_ID);
    if (error) report.errors.push(`embed-pointer: ${error.message}`);
    else report.embed_pointer_updated = true;
  } catch (e) { report.errors.push(`embed-pointer: ${(e as Error).message}`); }

  report.finished_at = new Date().toISOString();
  return new Response(JSON.stringify(report, null, 2), {
    status: 200, headers: { "content-type": "application/json" },
  });
});

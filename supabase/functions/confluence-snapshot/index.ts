// supabase/functions/confluence-snapshot/index.ts
//
// Confluence raw snapshot — etappe 1a.
// Pulls WikiOperativ pages (5 channel folders + 1 page + 1 embed) into
// confluence_raw / confluence_attachments / confluence_comments and uploads
// text-relevant attachments to the confluence-attachments storage bucket.
//
// Trigger via authenticated POST (service role / authorization header).
// Optional query: ?kanal=konti|xml|low|b2b|mietwagen|veranstalter|all (default all).
//
// Token: read from edge-function vault as ATLASIAN (single S). Never logged.
//
// Returns JSON report — counters per kanal, attachments, comments, errors.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ───────────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────────
const CONFLUENCE_BASE   = "https://aerticket.atlassian.net";
const CONFLUENCE_EMAIL  = "bdemir@airtuerk.de";
const SPACE_KEY         = "WikiOperativ";
const OPERATIVE_KANAELE_ID = "444017759";
const VERANSTALTER_PAGE_ID = "444009740";
const COCKPIT_EMBED_ID     = "446989123";
const THROTTLE_MS = 100;

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

// folder title (verbatim) → kanal slug
const FOLDER_KANAL: Record<string, string> = {
  "Konti Kanal":  "konti",
  "XML Kanal":    "xml",
  "LOW Kanal":    "low",
  "B2B Kanal":    "b2b",
  "Mietwagen":    "mietwagen",
};

// ───────────────────────────────────────────────────────────────────────────
// Confluence client
// ───────────────────────────────────────────────────────────────────────────
function authHeader(): string {
  const token = Deno.env.get("ATLASIAN");
  if (!token) throw new Error("Vault secret ATLASIAN is missing in this edge function environment");
  const basic = btoa(`${CONFLUENCE_EMAIL}:${token}`);
  return `Basic ${basic}`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function confluenceFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${CONFLUENCE_BASE}${path}`;
  let attempt = 0;
  while (true) {
    await sleep(THROTTLE_MS);
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: authHeader(),
        Accept: "application/json",
      },
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

// Paginate v2 endpoints (results + _links.next as relative path).
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

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────
function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function safeStoragePath(pageId: string, attId: string, filename: string): string {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^\w\.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "file";
  return `${pageId}/${attId}_${cleaned}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Per-page snapshot
// ───────────────────────────────────────────────────────────────────────────
type PageReport = {
  page_id: string;
  title: string;
  char_count: number;
  restricted: boolean;
  comments: number;
  attachments_total: number;
  attachments_uploaded: number;
  errors: string[];
};

async function snapshotPage(
  pageId: string,
  kanal: string,
  parentId: string | null,
  supabase: any,
): Promise<PageReport> {
  const rep: PageReport = {
    page_id: pageId,
    title: "",
    char_count: 0,
    restricted: false,
    comments: 0,
    attachments_total: 0,
    attachments_uploaded: 0,
    errors: [],
  };

  // 1) storage body + metadata
  const pageStorage: any = await confluenceJson(
    `/wiki/api/v2/pages/${pageId}?body-format=storage`,
  );
  rep.title = pageStorage.title ?? "";
  const bodyStorage: string = pageStorage.body?.storage?.value ?? "";
  rep.char_count = bodyStorage.length;

  // 2) view body (fallback)
  let bodyView = "";
  try {
    const pageView: any = await confluenceJson(
      `/wiki/api/v2/pages/${pageId}?body-format=view`,
    );
    bodyView = pageView.body?.view?.value ?? "";
  } catch (e) {
    rep.errors.push(`view: ${(e as Error).message}`);
  }

  // 3) ancestors
  let ancestors: any[] = [];
  try {
    const a: any = await confluenceJson(`/wiki/api/v2/pages/${pageId}/ancestors`);
    ancestors = (a.results ?? []).map((x: any) => ({ id: x.id, title: x.title }));
  } catch (e) {
    rep.errors.push(`ancestors: ${(e as Error).message}`);
  }

  // 4) labels
  let labels: any[] = [];
  try {
    labels = await paginateV2(`/wiki/api/v2/pages/${pageId}/labels?limit=100`);
  } catch (e) {
    rep.errors.push(`labels: ${(e as Error).message}`);
  }

  // 5) restrictions (v1)
  let restrictions: any = {};
  try {
    restrictions = await confluenceJson(
      `/wiki/rest/api/content/${pageId}/restriction/byOperation`,
    );
    const readRest = restrictions?.read?.restrictions;
    const updRest  = restrictions?.update?.restrictions;
    const hasAny =
      (readRest?.user?.size ?? 0) +
      (readRest?.group?.size ?? 0) +
      (updRest?.user?.size ?? 0) +
      (updRest?.group?.size ?? 0);
    rep.restricted = hasAny > 0;
  } catch (e) {
    rep.errors.push(`restrictions: ${(e as Error).message}`);
  }

  // 6) history (v1) for created_by / last_modified_by
  let createdBy = "";
  let createdAt: string | null = null;
  let lastModifiedBy = "";
  let lastModified: string | null = pageStorage.version?.createdAt ?? null;
  let versionNumber: number = pageStorage.version?.number ?? 0;
  try {
    const hist: any = await confluenceJson(
      `/wiki/rest/api/content/${pageId}?expand=history,history.lastUpdated`,
    );
    createdBy      = hist.history?.createdBy?.displayName ?? "";
    createdAt      = hist.history?.createdDate ?? null;
    lastModifiedBy = hist.history?.lastUpdated?.by?.displayName ?? "";
    lastModified   = hist.history?.lastUpdated?.when ?? lastModified;
  } catch (e) {
    rep.errors.push(`history: ${(e as Error).message}`);
  }

  // 7) UPSERT confluence_raw
  const bodyText = stripHtml(bodyStorage || bodyView);
  const sourceUrl =
    pageStorage._links?.webui
      ? `${CONFLUENCE_BASE}/wiki${pageStorage._links.webui}`
      : `${CONFLUENCE_BASE}/wiki/spaces/${SPACE_KEY}/pages/${pageId}`;

  const { error: upErr } = await supabase.from("confluence_raw").upsert({
    page_id: pageId,
    space_key: SPACE_KEY,
    title: rep.title,
    kanal,
    parent_id: parentId,
    ancestors,
    labels,
    body_storage: bodyStorage,
    body_view: bodyView,
    body_text: bodyText,
    char_count: rep.char_count,
    restrictions,
    created_by: createdBy,
    created_at: createdAt,
    version: versionNumber,
    last_modified: lastModified,
    last_modified_by: lastModifiedBy,
    snapshot_at: new Date().toISOString(),
    is_deleted: false,
    source_url: sourceUrl,
  }, { onConflict: "page_id" });
  if (upErr) rep.errors.push(`upsert page: ${upErr.message}`);

  // 8) Comments
  await snapshotComments(pageId, "footer", supabase, rep);
  await snapshotComments(pageId, "inline", supabase, rep);

  // 9) Attachments
  await snapshotAttachments(pageId, supabase, rep);

  return rep;
}

async function snapshotComments(
  pageId: string,
  type: "footer" | "inline",
  supabase: any,
  rep: PageReport,
) {
  const path = type === "footer"
    ? `/wiki/api/v2/pages/${pageId}/footer-comments?limit=100&body-format=storage`
    : `/wiki/api/v2/pages/${pageId}/inline-comments?limit=100&body-format=storage`;
  let comments: any[] = [];
  try {
    comments = await paginateV2(path);
  } catch (e) {
    rep.errors.push(`${type}-comments: ${(e as Error).message}`);
    return;
  }
  for (const c of comments) {
    const cBody = c.body?.storage?.value ?? "";
    const { error } = await supabase.from("confluence_comments").upsert({
      comment_id: String(c.id),
      page_id: pageId,
      author: c.authorId ?? "",
      body_text: stripHtml(cBody),
      created_at: c.version?.createdAt ?? null,
      comment_type: type,
      snapshot_at: new Date().toISOString(),
    }, { onConflict: "comment_id" });
    if (error) rep.errors.push(`comment ${c.id}: ${error.message}`);
    else rep.comments++;
  }
}

async function snapshotAttachments(pageId: string, supabase: any, rep: PageReport) {
  let attachments: any[] = [];
  try {
    attachments = await paginateV2(`/wiki/api/v2/pages/${pageId}/attachments?limit=100`);
  } catch (e) {
    rep.errors.push(`attachments-list: ${(e as Error).message}`);
    return;
  }
  rep.attachments_total = attachments.length;

  for (const att of attachments) {
    const id = String(att.id);
    const mediaType = att.mediaType ?? att.mimeType ?? "";
    const textRelevant = TEXT_RELEVANT_MIME.has(mediaType);
    const filename: string = att.title ?? "file";
    const fileSize: number = att.fileSize ?? 0;
    const downloadUrl: string | null = att.downloadLink
      ? `${CONFLUENCE_BASE}/wiki${att.downloadLink}`
      : null;

    let storagePath: string | null = null;

    if (textRelevant && downloadUrl) {
      try {
        const dlRes = await confluenceFetch(downloadUrl);
        if (dlRes.ok) {
          const bytes = new Uint8Array(await dlRes.arrayBuffer());
          storagePath = safeStoragePath(pageId, id, filename);
          const { error: stErr } = await supabase
            .storage
            .from("confluence-attachments")
            .upload(storagePath, bytes, {
              contentType: mediaType || "application/octet-stream",
              upsert: true,
            });
          if (stErr) {
            rep.errors.push(`upload ${id}: ${stErr.message}`);
            storagePath = null;
          } else {
            rep.attachments_uploaded++;
          }
        } else {
          rep.errors.push(`download ${id}: HTTP ${dlRes.status}`);
        }
      } catch (e) {
        rep.errors.push(`download ${id}: ${(e as Error).message}`);
      }
    }

    const { error: insErr } = await supabase.from("confluence_attachments").upsert({
      attachment_id: id,
      page_id: pageId,
      filename,
      media_type: mediaType,
      file_size: fileSize,
      is_text_relevant: textRelevant,
      storage_path: storagePath,
      extracted_text: null, // text extraction is a later step
      download_url: downloadUrl,
      snapshot_at: new Date().toISOString(),
    }, { onConflict: "attachment_id" });
    if (insErr) rep.errors.push(`att-row ${id}: ${insErr.message}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Embed manifest (single row)
// ───────────────────────────────────────────────────────────────────────────
async function snapshotEmbed(supabase: any, errors: string[]) {
  try {
    const emb: any = await confluenceJson(`/wiki/api/v2/embeds/${COCKPIT_EMBED_ID}`);
    const url = emb.embedUrl ?? "";
    const title = emb.title ?? "Embed";
    const { error } = await supabase.from("confluence_raw").upsert({
      page_id: COCKPIT_EMBED_ID,
      space_key: SPACE_KEY,
      title: `[EMBED] ${title}`,
      kanal: "external",
      parent_id: emb.parentId ?? null,
      ancestors: [],
      labels: [],
      body_storage: null,
      body_view: null,
      body_text: `Smart link to external space. Target: ${url}`,
      char_count: 0,
      restrictions: {},
      created_by: "",
      created_at: emb.createdAt ? new Date(emb.createdAt).toISOString() : null,
      version: emb.version?.number ?? 0,
      last_modified: emb.version?.createdAt ?? null,
      last_modified_by: "",
      snapshot_at: new Date().toISOString(),
      is_deleted: false,
      source_url: url,
    }, { onConflict: "page_id" });
    if (error) errors.push(`embed: ${error.message}`);
  } catch (e) {
    errors.push(`embed: ${(e as Error).message}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Entry
// ───────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const requested = (url.searchParams.get("kanal") ?? "all").toLowerCase();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL or service key missing in edge function env" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const report: any = {
    requested_kanal: requested,
    started_at: new Date().toISOString(),
    folders: {} as Record<string, any>,
    veranstalter: null as any,
    embed: { included: false },
    totals: { pages: 0, comments: 0, attachments_total: 0, attachments_uploaded: 0 },
    errors: [] as string[],
  };

  try {
    // List children of "Operative Kanäle" — fold name → kanal mapping.
    const opChildren = await paginateV2(
      `/wiki/api/v2/folders/${OPERATIVE_KANAELE_ID}/direct-children?limit=100`,
    );

    const wantAll = requested === "all";

    for (const child of opChildren as any[]) {
      const childType: string = child.type ?? "";
      const childId: string = String(child.id);
      const childTitle: string = child.title ?? "";

      // Veranstalter Kanal is a PAGE under Operative Kanäle (not a folder).
      if (childType === "page" && childId === VERANSTALTER_PAGE_ID) {
        if (wantAll || requested === "veranstalter") {
          const rep = await snapshotPage(childId, "veranstalter", OPERATIVE_KANAELE_ID, supabase);
          report.veranstalter = rep;
          report.totals.pages++;
          report.totals.comments           += rep.comments;
          report.totals.attachments_total  += rep.attachments_total;
          report.totals.attachments_uploaded += rep.attachments_uploaded;
        }
        continue;
      }

      if (childType !== "folder") continue;
      const kanal = FOLDER_KANAL[childTitle];
      if (!kanal) continue;
      if (!wantAll && requested !== kanal) continue;

      // List pages in this folder
      const pages = await paginateV2(
        `/wiki/api/v2/folders/${childId}/direct-children?limit=100`,
      );

      const folderRep = {
        title: childTitle,
        folder_id: childId,
        pages: [] as PageReport[],
        page_count: 0,
        restricted: 0,
        comments: 0,
        attachments_total: 0,
        attachments_uploaded: 0,
        errors: [] as string[],
      };

      for (const pg of pages as any[]) {
        if (pg.type !== "page") continue;
        try {
          const rep = await snapshotPage(String(pg.id), kanal, childId, supabase);
          folderRep.pages.push(rep);
          folderRep.page_count++;
          if (rep.restricted) folderRep.restricted++;
          folderRep.comments           += rep.comments;
          folderRep.attachments_total  += rep.attachments_total;
          folderRep.attachments_uploaded += rep.attachments_uploaded;
          report.totals.pages++;
          report.totals.comments           += rep.comments;
          report.totals.attachments_total  += rep.attachments_total;
          report.totals.attachments_uploaded += rep.attachments_uploaded;
        } catch (e) {
          folderRep.errors.push(`page ${pg.id}: ${(e as Error).message}`);
        }
      }

      report.folders[kanal] = folderRep;
    }

    // Embed manifest — only when running "all" or explicitly requested.
    if (wantAll || requested === "embed") {
      await snapshotEmbed(supabase, report.errors);
      report.embed = { included: true, embed_id: COCKPIT_EMBED_ID };
    }
  } catch (e) {
    report.errors.push(`fatal: ${(e as Error).message}`);
  }

  report.finished_at = new Date().toISOString();
  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

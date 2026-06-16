/**
 * Server-only page + block data access for the public frontend.
 *
 * DRAFT VISIBILITY (Task 3): the `pages`/`blocks` RLS policies only expose
 * status='published' rows to the public (anon) key, and all content is
 * currently draft — so anonymous reads would 404 everywhere. SHOW_DRAFTS
 * controls this:
 *   - default ON in development, OFF in production (override with the
 *     SHOW_DRAFTS env var: "true" | "false").
 *   - ON  → read via the service-role admin client (bypasses RLS) so drafts are
 *           viewable while building. SERVER-ONLY; the secret never reaches the
 *           client (it has no NEXT_PUBLIC_ prefix).
 *   - OFF → read via the anon server client; RLS restricts to published rows,
 *           so drafts 404 for anonymous visitors (correct production behavior).
 *
 * Do not import this module from a Client Component.
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlockRow } from "@/lib/blocks/types";

export const SHOW_DRAFTS =
  process.env.SHOW_DRAFTS != null
    ? process.env.SHOW_DRAFTS === "true"
    : process.env.NODE_ENV !== "production";

export interface PageRow {
  id: string;
  slug: string;
  full_path: string;
  number: number | null;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  rendering_mode: "blocks" | "hardcoded";
  component_key: string | null;
  status: string;
}

const PAGE_COLUMNS =
  "id, slug, full_path, number, title, meta_title, meta_description, rendering_mode, component_key, status";

// Reads that must see drafts in dev use the admin client; production anonymous
// reads use the RLS-scoped anon client.
async function readClient() {
  return SHOW_DRAFTS ? createAdminClient() : await createClient();
}

/**
 * Resolve a URL path to a page row, or null if none is visible.
 * Wrapped in React cache() so generateMetadata and the render share one query
 * per request.
 */
export const getPageByPath = cache(async (fullPath: string): Promise<PageRow | null> => {
  const supabase = await readClient();
  let query = supabase.from("pages").select(PAGE_COLUMNS).eq("full_path", fullPath);
  if (!SHOW_DRAFTS) query = query.eq("status", "published");
  const { data } = await query.maybeSingle();
  return (data as PageRow | null) ?? null;
});

/** Ordered blocks for a page (empty array if none authored yet). */
export async function getBlocks(pageId: string): Promise<BlockRow[]> {
  const supabase = await readClient();
  const { data } = await supabase
    .from("blocks")
    .select("id, type, position, layout, heading, anchor, content")
    .eq("page_id", pageId)
    .order("position", { ascending: true });
  return (data as BlockRow[] | null) ?? [];
}

/** Visible IBE products (for the /ibe-product-suite anchor sections). */
export async function getIbeProducts(): Promise<{ slug: string; name: string }[]> {
  const supabase = await createClient(); // brands are public-readable
  const { data: ibe } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", "ibe-product-suite")
    .maybeSingle();
  if (!ibe) return [];
  const { data } = await supabase
    .from("brands")
    .select("slug, name, short_name, sort_order")
    .eq("is_product", true)
    .eq("parent_id", ibe.id)
    .neq("slug", "airlounge") // D-043: kept in DB, hidden
    .order("sort_order");
  return (data ?? []).map((b) => ({ slug: b.slug as string, name: (b.short_name as string) || (b.name as string) }));
}

// ── Assets (Asset Library, Task 5a) ──
// The assets table has no category column; category is derived from the
// storage_path folder prefix. The Asset Library shows the `images` bucket
// (logos / icons / backgrounds / photography); documents and videos have their
// own libraries. Assets are public-read (RLS qual=true), so the anon server
// client works in dev and prod — no service-role needed here.
export interface AssetDTO {
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
  category: string;
}

const ASSET_CATEGORY: Record<string, string> = {
  "brand-logos": "Logos",
  icons: "Icons",
  favicon: "Icons",
  "desktop-backgrounds": "Backgrounds",
  "team-backgrounds": "Backgrounds",
  "stock-photography": "Photography",
  "product-shots": "Photography",
  opengraph: "Photography",
  thumbnails: "Photography",
  misc: "Photography",
};

function assetCategory(storagePath: string): string {
  return ASSET_CATEGORY[storagePath.split("/")[0]] ?? "Other";
}

/** All image-bucket assets, mapped to a lean DTO with a derived category. */
export async function getImageAssets(): Promise<AssetDTO[]> {
  const supabase = await createClient(); // assets are public-read
  const { data } = await supabase
    .from("assets")
    .select("id, storage_path, public_url, filename, mime_type, size_bytes")
    .eq("bucket", "images")
    .order("storage_path", { ascending: true });
  return (data ?? []).map((a) => ({
    id: a.id as string,
    url: a.public_url as string,
    name: a.filename as string,
    mime: a.mime_type as string,
    size: a.size_bytes as number,
    category: assetCategory(a.storage_path as string),
  }));
}

// ── Document Library (Task 5d/5e) ──
// `documents` are paired via pair_id (self-FK → documents.id): rows sharing a
// pair_id are the PDF + Office versions of one logical document and collapse into
// ONE card. `department` (Task 5d) is the coarse filter chip; rows with NULL
// department are intentionally excluded (master-deck / logos / misc live
// elsewhere). documents + assets are public-read, so the anon client works in
// dev and prod.

export type DocFormatKind = "PDF" | "Word" | "PPTX" | "ZIP" | "File";

export interface DocFormat {
  kind: DocFormatKind;
  url: string;
  filename: string;
}

export interface DocCardDTO {
  pairId: string;
  title: string;
  department: string;
  category: string;
  language: string | null;
  version: string | null;
  /** Per-document preview cover; null → caller uses the shared fallback. */
  coverUrl: string | null;
  formats: DocFormat[];
}

export interface DocumentLibraryData {
  cards: DocCardDTO[];
  /** Shared fallback cover used until a document's preview_asset_id is set. */
  sampleCoverUrl: string | null;
}

const SAMPLE_COVER_PATH = "misc/Partner-Framework-Cover.jpg";
const FORMAT_RANK: Record<DocFormatKind, number> = { PDF: 0, Word: 1, PPTX: 2, ZIP: 3, File: 4 };

function docFormatKind(mime: string): DocFormatKind {
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "Word";
  if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "PPTX";
  if (mime === "application/zip") return "ZIP";
  return "File";
}

type AssetEmbed = { public_url: string | null; filename: string | null; mime_type: string | null };
interface DocRow {
  id: string;
  pair_id: string | null;
  title: string;
  department: string | null;
  category: string;
  language: string | null;
  version: string | null;
  asset: AssetEmbed | AssetEmbed[] | null;
  preview: { public_url: string | null } | { public_url: string | null }[] | null;
}

// PostgREST embeds a to-one relation as an object, but the generated types widen
// it to an array; normalize either shape to a single row.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Document Library data: only documents WITH a department (the chip groups),
 * collapsed by pair_id into one card per logical document carrying its available
 * download formats. `coverUrl` resolves preview_asset_id (per-doc cover); when
 * null the page falls back to `sampleCoverUrl`. documents has two FKs to assets
 * (asset_id, preview_asset_id) — disambiguated by constraint name in the embed.
 */
export async function getDocumentLibrary(): Promise<DocumentLibraryData> {
  const supabase = await createClient(); // documents + assets are public-read

  const { data: coverRow } = await supabase
    .from("assets")
    .select("public_url")
    .eq("storage_path", SAMPLE_COVER_PATH)
    .maybeSingle();
  const sampleCoverUrl = (coverRow?.public_url as string | undefined) ?? null;

  const { data } = await supabase
    .from("documents")
    .select(
      "id, pair_id, title, department, category, language, version, sort_order, " +
        "asset:assets!documents_asset_id_fkey(public_url, filename, mime_type), " +
        "preview:assets!documents_preview_asset_id_fkey(public_url)"
    )
    .not("department", "is", null)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  const rows = (data ?? []) as unknown as DocRow[];
  const byPair = new Map<string, DocCardDTO>();

  for (const row of rows) {
    const asset = one(row.asset);
    if (!asset?.public_url) continue; // every shown doc has a URL (gate-verified); defensive
    const pairId = row.pair_id ?? row.id;
    let card = byPair.get(pairId);
    if (!card) {
      card = {
        pairId,
        title: row.title,
        department: row.department as string,
        category: row.category,
        language: row.language,
        version: row.version,
        coverUrl: null,
        formats: [],
      };
      byPair.set(pairId, card);
    }
    // First non-null preview in the group wins; per-doc cover overrides the fallback.
    card.coverUrl = card.coverUrl ?? one(row.preview)?.public_url ?? null;
    card.formats.push({
      kind: docFormatKind(asset.mime_type ?? ""),
      url: asset.public_url,
      filename: asset.filename ?? "",
    });
  }

  return {
    cards: [...byPair.values()].map((c) => ({
      ...c,
      formats: c.formats.sort((a, b) => FORMAT_RANK[a.kind] - FORMAT_RANK[b.kind]),
    })),
    sampleCoverUrl,
  };
}

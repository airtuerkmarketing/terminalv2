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

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
 * CACHING (Phase A, D-056): the three public read functions — getPageByPath,
 * getBlocks, getBrandSectionsAll — are wrapped in unstable_cache with a 24h TTL
 * (brand content changes 3-5x/year, so the window is deliberately conservative)
 * and a tag hierarchy:
 *   - pages:all                 global invalidation
 *   - page:{fullPath}           a single page row
 *   - blocks:page:{pageId}      one page's blocks
 *   - brand-sections:{parentId} one brand's section tree
 * The cache is GUARDED on SHOW_DRAFTS: only the SHOW_DRAFTS=true path (admin
 * client, cookie-free, deterministic) is cached. The SHOW_DRAFTS=false path reads
 * via the anon client with cookies(), which cannot run inside unstable_cache, so
 * it stays uncached until Phase C extracts a cookie-free read path.
 * No revalidateTag wiring exists yet (Phase A1 follow-up); until then the 24h TTL
 * is the only invalidation, so edits can take up to 24h to reflect on production.
 *
 * Do not import this module from a Client Component.
 */
import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlockRow } from "@/lib/blocks/types";

export const SHOW_DRAFTS =
  process.env.SHOW_DRAFTS != null
    ? process.env.SHOW_DRAFTS === "true"
    : process.env.NODE_ENV !== "production";

export interface PageRow {
  id: string;
  parent_id: string | null;
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
  "id, parent_id, slug, full_path, number, title, meta_title, meta_description, rendering_mode, component_key, status";

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
  const run = async (): Promise<PageRow | null> => {
    const supabase = await readClient();
    let query = supabase.from("pages").select(PAGE_COLUMNS).eq("full_path", fullPath);
    if (!SHOW_DRAFTS) query = query.eq("status", "published");
    const { data } = await query.maybeSingle();
    return (data as PageRow | null) ?? null;
  };
  if (!SHOW_DRAFTS) return run(); // cookie-bound anon path — uncached (see file header)
  return unstable_cache(run, ["page-by-path", fullPath], {
    tags: ["pages:all", `page:${fullPath}`],
    revalidate: 86400,
  })();
});

/** Ordered blocks for a page (empty array if none authored yet). */
export async function getBlocks(pageId: string): Promise<BlockRow[]> {
  const run = async (): Promise<BlockRow[]> => {
    const supabase = await readClient();
    const { data } = await supabase
      .from("blocks")
      .select("id, type, position, layout, heading, anchor, content")
      .eq("page_id", pageId)
      .order("position", { ascending: true });
    return (data as BlockRow[] | null) ?? [];
  };
  if (!SHOW_DRAFTS) return run(); // cookie-bound anon path — uncached (see file header)
  return unstable_cache(run, ["blocks-by-page", pageId], {
    tags: ["pages:all", `blocks:page:${pageId}`],
    revalidate: 86400,
  })();
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

// ── Single-page brand model (Task 6) ──
// Most top-level brands render as ONE scrolling page: their child pages
// (blocks AND hardcoded) become in-page anchor sections. EXCLUDED:
//   • ibe-product-suite — retains its own product-brand-driven single-page path
//     (getIbeProducts), which preserves the spec'd product order.
// airtuerk-apix was previously excluded but is now a single-page brand:
// its 4 hardcoded tools + block sections all render as anchors on /airtuerk-apix.
const SINGLE_PAGE_EXCLUDED_SLUGS = new Set(["ibe-product-suite"]);

/** Slugs of top-level brands that render as a single anchored page. Cached so
 *  the sidebar (getNav), the redirect check, and the aggregator share one read. */
export const getSinglePageBrandSlugs = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient(); // brands are public-readable
  const { data } = await supabase
    .from("brands")
    .select("slug")
    .is("parent_id", null)
    .eq("sidebar_section", "brands");
  return new Set(
    (data ?? []).map((b) => b.slug as string).filter((slug) => !SINGLE_PAGE_EXCLUDED_SLUGS.has(slug))
  );
});

export interface SidebarChild {
  slug: string;
  title: string;
  rendering_mode: "blocks" | "hardcoded";
}

/**
 * Visible child pages grouped by top-level parent slug, for the sidebar sub-nav.
 * Ordered by sort_order, hidden_in_sidebar excluded. Draft-aware (dev sees
 * drafts; prod anon sees only published, so children stay empty until publish —
 * consistent with the rest of the site).
 */
export async function getSidebarChildren(): Promise<Map<string, SidebarChild[]>> {
  const supabase = await readClient();
  let query = supabase
    .from("pages")
    .select("id, slug, title, rendering_mode, parent_id, hidden_in_sidebar, status, sort_order")
    .order("sort_order", { ascending: true });
  if (!SHOW_DRAFTS) query = query.eq("status", "published");
  const { data } = await query;
  type Row = {
    id: string;
    slug: string;
    title: string;
    rendering_mode: "blocks" | "hardcoded";
    parent_id: string | null;
    hidden_in_sidebar: boolean;
  };
  const rows = (data ?? []) as Row[];
  const idToSlug = new Map(rows.map((r) => [r.id, r.slug]));
  const byParent = new Map<string, SidebarChild[]>();
  for (const r of rows) {
    if (!r.parent_id || r.hidden_in_sidebar) continue;
    const parentSlug = idToSlug.get(r.parent_id);
    if (!parentSlug) continue;
    const arr = byParent.get(parentSlug) ?? [];
    arr.push({ slug: r.slug, title: r.title, rendering_mode: r.rendering_mode });
    byParent.set(parentSlug, arr);
  }
  return byParent;
}

/** A single in-page anchor section — either block-driven or a hardcoded tool. */
export type BrandSectionAny =
  | { slug: string; title: string; rendering_mode: "blocks"; component_key: null; blocks: BlockRow[] }
  | { slug: string; title: string; rendering_mode: "hardcoded"; component_key: string; blocks: [] };

/**
 * All visible child pages of a single-page brand parent (both block-mode and
 * hardcoded), ordered by sort_order — used for the combined anchor-section
 * rendering where hardcoded tools embed alongside brand-identity sections.
 * Draft-aware.
 */
export async function getBrandSectionsAll(parentId: string): Promise<BrandSectionAny[]> {
  const run = async (): Promise<BrandSectionAny[]> => {
    const supabase = await readClient();
    let query = supabase
      .from("pages")
      .select("id, slug, title, sort_order, status, rendering_mode, component_key")
      .eq("parent_id", parentId)
      .eq("hidden_in_sidebar", false)
      .order("sort_order", { ascending: true });
    if (!SHOW_DRAFTS) query = query.eq("status", "published");
    const { data } = await query;
    const kids = (data ?? []) as {
      id: string; slug: string; title: string;
      rendering_mode: "blocks" | "hardcoded"; component_key: string | null;
    }[];
    return Promise.all(
      kids.map(async (k): Promise<BrandSectionAny> => {
        if (k.rendering_mode === "hardcoded") {
          return { slug: k.slug, title: k.title, rendering_mode: "hardcoded", component_key: k.component_key ?? k.slug, blocks: [] };
        }
        return { slug: k.slug, title: k.title, rendering_mode: "blocks", component_key: null, blocks: await getBlocks(k.id) };
      })
    );
  };
  if (!SHOW_DRAFTS) return run(); // cookie-bound anon path — uncached (see file header)
  // Nested cache: run() calls getBlocks (itself cached). A future
  // revalidateTag("blocks:page:X") would hit only the inner getBlocks entry, not
  // this outer brand-sections entry — the clean lever is pages:all (or the 24h
  // TTL). The Phase A1 invalidation task should fire pages:all on every edit.
  return unstable_cache(run, ["brand-sections", parentId], {
    tags: ["pages:all", `brand-sections:${parentId}`],
    revalidate: 86400,
  })();
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

// PostgREST embeds a to-one relation as an object, but the generated types widen
// it to an array; normalize either shape to a single row.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ── Team Directory (/team) ──
// team_members carries richer fields (is_lead, joined_year, tools, tasks) for a
// future detail modal; the current directory UI uses only name/position/
// department/initials/photo. The profile photo is an FK to assets
// (avatar_asset_id); resolve it to a public URL via the embed. team_members is
// public-read, so the anon client works in dev and prod.
export interface TeamMemberDTO {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  initials: string;
  photoUrl: string | null;
  email: string | null;
}

/** All team members, ordered by sort_order (alphabetical by last name). */
export async function getTeamMembers(): Promise<TeamMemberDTO[]> {
  const supabase = await createClient(); // team_members is public-read
  const { data } = await supabase
    .from("team_members")
    .select(
      "id, first_name, last_name, position, department, initials, email, sort_order, " +
        "avatar:assets!team_members_avatar_asset_id_fkey(public_url)"
    )
    .order("sort_order", { ascending: true });
  type Row = {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    department: string | null;
    initials: string;
    email: string | null;
    avatar: { public_url: string | null } | { public_url: string | null }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    position: r.position,
    department: r.department,
    initials: r.initials,
    photoUrl: one(r.avatar)?.public_url ?? null,
    email: r.email,
  }));
}

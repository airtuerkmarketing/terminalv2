import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIdentity } from "@/lib/documents";
import type { SearchHit, SearchResults } from "@/lib/search/types";

/* Live search for the dashboard hero (BAU-Auftrag §5.3, Option B).
 *
 * Runs SERVER-SIDE with the service-role (SUPABASE_SECRET_KEY) admin client so
 * it bypasses RLS — otherwise the public role only sees 3 of 57 `pages`
 * (pages_select_published). documents/assets/brands are already public-read,
 * but routing all four through one server handler keeps the secret server-only
 * and the client a single fetch. NEVER import the admin client client-side.
 *
 * Security guards: min 2 chars (no empty-string table dump), 5 rows per table
 * (≤ 20 total), and the user value is stripped of the PostgREST .or() grammar
 * characters (comma / parenthesis / star) before interpolation. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_TABLE = 5;

interface PageRow {
  id: string;
  title: string | null;
  slug: string | null;
  full_path: string | null;
}
type FolderEmbed = { name: string | null; path: string | null; is_public: boolean };
interface FileHitRow {
  id: string;
  title: string | null;
  document_folders: FolderEmbed | FolderEmbed[] | null;
}
interface FolderHitRow {
  id: string;
  name: string | null;
  path: string | null;
}
interface AssetRow {
  id: string;
  filename: string | null;
  alt_text: string | null;
  public_url: string | null;
}
interface BrandRow {
  id: string;
  name: string | null;
  slug: string | null;
  short_name: string | null;
  tagline: string | null;
}

function empty(): SearchResults {
  return { pages: [], documents: [], assets: [], brands: [] };
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 2) return NextResponse.json({ results: empty() });

  // Strip characters that are structural in the PostgREST .or() filter grammar
  // (comma separates conditions, parens group, star is the ilike wildcard we
  // add ourselves). They can only broaden or break the filter — never needed
  // for a substring match.
  const q = raw.replace(/[,()*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: empty() });

  const p = `%${q}%`;

  // Auth gate (SEC-01): the dashboard search box lives behind the (public) login
  // gate, so only signed-in users ever legitimately call this. The handler runs
  // with the service-role client below (RLS-bypass), and Next 16's proxy.ts does
  // NOT auth-gate (CVE-2025-29927) — so without this check an anonymous caller on
  // the public internet would receive draft page titles/slugs/paths. Reject anon.
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ results: empty() }, { status: 401 });
  }
  const isAdmin = identity.isAdmin;

  const supabase = createAdminClient();

  // Library results respect folder visibility: the service-role client bypasses
  // RLS, so we filter is_public ourselves for non-admin callers (no NDA-title
  // leak via search). Admins (session-resolved) see everything.

  let filesQuery = supabase
    .from("document_files")
    .select("id, title, document_folders!inner(name, path, is_public)")
    .or(`title.ilike.${p},description.ilike.${p}`)
    .limit(PER_TABLE);
  if (!isAdmin) filesQuery = filesQuery.eq("document_folders.is_public", true);

  let foldersQuery = supabase
    .from("document_folders")
    .select("id, name, path, is_public")
    .ilike("name", p)
    .limit(PER_TABLE);
  if (!isAdmin) foldersQuery = foldersQuery.eq("is_public", true);

  // Pages mirror the pages_select_published RLS policy: non-admins see only
  // published pages, admins see drafts too. The service-role client bypasses RLS,
  // so we re-apply the status gate here (SEC-01 — was previously unfiltered).
  let pagesQuery = supabase
    .from("pages")
    .select("id, title, slug, full_path")
    .or(
      `title.ilike.${p},meta_title.ilike.${p},meta_description.ilike.${p},slug.ilike.${p},full_path.ilike.${p}`
    )
    .limit(PER_TABLE);
  if (!isAdmin) pagesQuery = pagesQuery.eq("status", "published");

  const [pagesRes, filesRes, foldersRes, assetsRes, brandsRes] = await Promise.all([
    pagesQuery,
    filesQuery,
    foldersQuery,
    supabase
      .from("assets")
      .select("id, filename, alt_text, public_url")
      .or(`filename.ilike.${p},alt_text.ilike.${p},caption.ilike.${p}`)
      .limit(PER_TABLE),
    supabase
      .from("brands")
      .select("id, name, slug, short_name, tagline")
      .or(`name.ilike.${p},short_name.ilike.${p},slug.ilike.${p},tagline.ilike.${p}`)
      .limit(PER_TABLE),
  ]);

  // Merge library file + folder hits into one "documents" group (files first).
  const oneOf = <T,>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? v[0] ?? null : v;
  const fileHits: SearchHit[] = ((filesRes.data as FileHitRow[] | null) ?? []).map((r) => {
    const folder = oneOf(r.document_folders);
    return {
      id: r.id,
      title: r.title?.trim() || "Datei",
      subtitle: folder?.name ?? null,
      href: folder?.path ? `/documents-library/${folder.path}?file=${r.id}` : "/documents-library",
    };
  });
  const folderHits: SearchHit[] = ((foldersRes.data as FolderHitRow[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.name?.trim() || "Ordner",
    subtitle: "Ordner",
    href: r.path ? `/documents-library/${r.path}` : "/documents-library",
  }));
  const documentHits = [...fileHits, ...folderHits].slice(0, PER_TABLE);

  const results: SearchResults = {
    pages: ((pagesRes.data as PageRow[] | null) ?? []).map(
      (r): SearchHit => ({
        id: r.id,
        title: r.title?.trim() || r.full_path || "Seite",
        subtitle: r.full_path ?? null,
        href: r.full_path || (r.slug ? `/${r.slug}` : "/"),
      })
    ),
    documents: documentHits,
    assets: ((assetsRes.data as AssetRow[] | null) ?? []).map(
      (r): SearchHit => ({
        id: r.id,
        title: r.alt_text?.trim() || r.filename || "Asset",
        subtitle: r.filename ?? null,
        href: r.public_url || "/asset-library",
      })
    ),
    brands: ((brandsRes.data as BrandRow[] | null) ?? []).map(
      (r): SearchHit => ({
        id: r.id,
        title: r.name?.trim() || "Marke",
        subtitle: r.tagline ?? r.short_name ?? null,
        href: r.slug ? `/${r.slug}` : "/",
      })
    ),
  };

  return NextResponse.json({ results });
}

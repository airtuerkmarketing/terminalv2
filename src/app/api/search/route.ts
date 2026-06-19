import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
interface DocRow {
  id: string;
  title: string | null;
  category: string | null;
  department: string | null;
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
  const supabase = createAdminClient();

  const [pagesRes, docsRes, assetsRes, brandsRes] = await Promise.all([
    supabase
      .from("pages")
      .select("id, title, slug, full_path")
      .or(
        `title.ilike.${p},meta_title.ilike.${p},meta_description.ilike.${p},slug.ilike.${p},full_path.ilike.${p}`
      )
      .limit(PER_TABLE),
    supabase
      .from("documents")
      .select("id, title, category, department")
      .or(`title.ilike.${p},description.ilike.${p},category.ilike.${p}`)
      .limit(PER_TABLE),
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

  const results: SearchResults = {
    pages: ((pagesRes.data as PageRow[] | null) ?? []).map(
      (r): SearchHit => ({
        id: r.id,
        title: r.title?.trim() || r.full_path || "Seite",
        subtitle: r.full_path ?? null,
        href: r.full_path || (r.slug ? `/${r.slug}` : "/"),
      })
    ),
    documents: ((docsRes.data as DocRow[] | null) ?? []).map(
      (r): SearchHit => ({
        id: r.id,
        title: r.title?.trim() || "Dokument",
        subtitle: r.category ?? r.department ?? null,
        href: "/documents-library",
      })
    ),
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

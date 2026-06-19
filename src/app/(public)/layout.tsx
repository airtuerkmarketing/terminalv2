import "@/styles/shell.css";
import "@/styles/blocks.css";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSinglePageBrandSlugs, getSidebarChildren } from "@/lib/pages";
import { Ambient } from "@/components/shell/ambient";
import {
  Sidebar,
  type NavLeaf,
  type NavNode,
  type SidebarNav,
} from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

const IBE_SLUG = "ibe-product-suite";

/** Resources section — hardcoded routes per ARCHITECTURE.md §3 / §5. */
const RESOURCES: NavLeaf[] = [
  { label: "Asset Library", href: "/asset-library", iconKey: "asset-library" },
  { label: "Document Library", href: "/documents-library", iconKey: "document-library" },
  { label: "Team", href: "/team", iconKey: "team" },
  { label: "Presentation Hub", href: "/presentation-hub", iconKey: "presentation-hub" },
  // Three AI TEST review pages — flat siblings directly under Presentation Hub
  // (the Resources section is flat; no child-nesting like the brand nodes).
  { label: "AI TEST 1", href: "/presentation-hub/ai-test-1", iconKey: "presentation-hub" },
  { label: "AI TEST 2", href: "/presentation-hub/ai-test-2", iconKey: "presentation-hub" },
  { label: "AI TEST 3", href: "/presentation-hub/ai-test-3", iconKey: "presentation-hub" },
];

/**
 * IBE products kept in the DB but permanently hidden from the sidebar (D-043).
 * pages.hidden_in_sidebar is the runtime source of truth (ARCHITECTURE.md §3),
 * but those product pages are still drafts and the public RLS policy on `pages`
 * only exposes published rows — so the anon key can't read the flag yet. This
 * constant guarantees the locked decision regardless; once the pages are
 * published, the pages query below also picks up any admin-toggled hidden ones.
 */
const SPEC_HIDDEN_PRODUCT_SLUGS = ["airlounge"];

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  is_product: boolean;
  sidebar_section: string;
  parent_id: string | null;
};

/**
 * Build the sidebar tree from the DB. Top-level = brands with
 * sidebar_section='brands' and no parent, ordered by sort_order. IBE products
 * (is_product, parent=IBE) nest under it, minus any hidden product (see above).
 */
async function getNav(): Promise<SidebarNav> {
  const supabase = await createClient();

  const [{ data: brandRows }, { data: hiddenPages }, singlePageSlugs, sidebarChildren] =
    await Promise.all([
      supabase
        .from("brands")
        .select("id, slug, name, short_name, sort_order, is_product, sidebar_section, parent_id")
        .order("sort_order"),
      supabase
        .from("pages")
        .select("slug")
        .like("full_path", `/${IBE_SLUG}/%`)
        .eq("hidden_in_sidebar", true),
      getSinglePageBrandSlugs(),
      getSidebarChildren(),
    ]);

  const brands = (brandRows ?? []) as BrandRow[];
  const hiddenSlugs = new Set<string>([
    ...SPEC_HIDDEN_PRODUCT_SLUGS,
    ...(hiddenPages ?? []).map((p) => p.slug as string),
  ]);
  const label = (b: BrandRow) => b.short_name?.trim() || b.name;

  const ibe = brands.find((b) => b.slug === IBE_SLUG);
  const topLevel = brands.filter(
    (b) => b.parent_id === null && b.sidebar_section === "brands"
  );

  const brandsNav: NavNode[] = topLevel.map((b) => {
    const node: NavNode = { label: label(b), href: `/${b.slug}`, iconKey: b.slug };
    if (singlePageSlugs.has(b.slug)) {
      // Single-page brand: ALL child pages become anchor sub-nav items, both
      // block and hardcoded (APIX tools, email-signature, …) — the parent page
      // embeds them as inline sections, so deep routes redirect to the anchor.
      const kids = sidebarChildren.get(b.slug) ?? [];
      if (kids.length > 0) {
        node.children = kids.map<NavLeaf>((c) => ({
          label: c.title,
          href: `/${b.slug}#${c.slug}`,
          iconKey: c.slug,
        }));
      }
    } else if (b.slug === IBE_SLUG && ibe) {
      // IBE keeps its product-brand anchor children (preserves the spec'd order).
      node.children = brands
        .filter((p) => p.is_product && p.parent_id === ibe.id && !hiddenSlugs.has(p.slug))
        .map<NavLeaf>((p) => ({
          label: label(p),
          href: `/${IBE_SLUG}#${p.slug}`,
          iconKey: p.slug,
        }));
    }
    // else (non-single-page, non-IBE brands): flat link, no children.
    return node;
  });

  return {
    dashboard: { label: "Dashboard", href: "/", iconKey: "dashboard" },
    brands: brandsNav,
    resources: RESOURCES,
  };
}

// Apply persisted theme/orbs/sidebar before paint to avoid a flash.
const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('terminalv2-theme');if(t==='ios18-light'||t==='ios18-dark')d.dataset.theme=t;var o=localStorage.getItem('terminalv2-orbs');if(o==='on'||o==='off')d.dataset.orbs=o;var s=localStorage.getItem('terminalv2-sidebar');if(s==='expanded'||s==='collapsed')d.dataset.sidebar=s;}catch(e){}})();`;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const nav = await getNav();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      <Ambient />
      <div className="layout">
        <Sidebar nav={nav} />
        <main className="main">
          <Topbar />
          {children}
        </main>
      </div>
    </>
  );
}

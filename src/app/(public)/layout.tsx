import "@/styles/shell.css";
import "@/styles/blocks.css";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSinglePageBrandSlugs, getSidebarChildren } from "@/lib/pages";
import { getFolderTreeForSidebar, getIdentity } from "@/lib/documents";
import {
  Sidebar,
  type NavLeaf,
  type NavNode,
  type SidebarNav,
} from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { RadialKit } from "@/components/shell/RadialKit";

const IBE_SLUG = "ibe-product-suite";

/** Resources section — hardcoded routes per ARCHITECTURE.md §3 / §5. Document
 *  Library is an EXPANDABLE node whose children are the visible top-level folders
 *  (built in getNav, RLS-scoped); the rest stay flat leaves. */
// Sidebar Resources order: Presentations → Documents → Assets → Duty Free.
const RESOURCES_BEFORE: NavLeaf[] = [
  { label: "Presentations", href: "/presentation-hub", iconKey: "presentation-hub" },
];
const RESOURCES_AFTER: NavLeaf[] = [
  { label: "Assets", href: "/asset-library", iconKey: "asset-library" },
  // "Duty Free" supersedes the standalone "Team" entry — the crew now lives inside
  // the Duty Free Crew object, and /team 308-redirects here (next.config.ts).
  { label: "Duty Free", href: "/duty-free", iconKey: "duty-free" },
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

  const [
    { data: brandRows },
    { data: hiddenPages },
    singlePageSlugs,
    sidebarChildren,
    libraryFolders,
  ] = await Promise.all([
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
    getFolderTreeForSidebar(), // RLS-scoped: anon sees only public top-level folders
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

  const documentLibrary: NavNode = {
    label: "Documents",
    href: "/documents-library",
    iconKey: "document-library",
    children: libraryFolders.map((f) => ({
      label: f.name,
      href: `/documents-library/${f.path}`,
      iconKey: "document-library",
      isPrivate: !f.isPublic, // → Torch icon in the sidebar (admin-only cue)
    })),
  };

  return {
    dashboard: { label: "Dashboard", href: "/", iconKey: "dashboard" },
    brands: brandsNav,
    resources: [...RESOURCES_BEFORE, documentLibrary, ...RESOURCES_AFTER],
  };
}

// Apply persisted theme/sidebar before paint to avoid a flash.
// Also pre-paint-collapses the global rail on library routes (own secondary
// sidebar) so there's no expand→collapse flash on a hard load. Keep the prefix
// list in lock-step with LIBRARY_ROUTE_PREFIXES in shell/sidebar.tsx.
const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('terminalv2-theme');if(t==='ios18-light'||t==='ios18-dark')d.dataset.theme=t;var s=localStorage.getItem('terminalv2-sidebar');if(s==='expanded'||s==='collapsed')d.dataset.sidebar=s;var p=location.pathname;if(p==='/documents-library'||p.indexOf('/documents-library/')===0||p==='/presentation-hub'||p.indexOf('/presentation-hub/')===0)d.dataset.sidebar='collapsed';}catch(e){}})();`;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const i = (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return (i || name.slice(0, 2)).toUpperCase();
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // getIdentity() is React-cached, so this auth read is shared with the pages
  // rendered inside this layout (no duplicate query per request).
  const [nav, identity] = await Promise.all([getNav(), getIdentity()]);

  // Global login gate: anonymous visitors hitting ANY (public) route are sent
  // to /login. The /admin shell keeps its own gate; /login* sits outside this
  // group, so there's no redirect loop. Default post-login landing is / (the
  // ?next param is read inside login/page.tsx when present).
  if (!identity) {
    redirect("/login");
  }

  // Force-Password-Change Gate (Block 2): a seeded user who has never set their
  // own password is held at /login/update-password until they do. That route is
  // OUTSIDE the (public) group, so this layout never runs there → no loop.
  if (identity.forcePasswordChange) {
    redirect("/login/update-password?type=force");
  }

  const isAdmin = identity?.isAdmin ?? false;
  const isSuperAdmin = identity?.isSuperAdmin ?? false;
  const displayName = identity
    ? identity.fullName?.trim() || identity.email?.split("@")[0] || "User"
    : null;
  const sidebarIdentity =
    identity && displayName
      ? {
          name: displayName,
          email: identity.email ?? "",
          role: isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "User",
          initials: initialsOf(displayName),
          isSuperAdmin,
        }
      : null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      <div className="layout">
        <Sidebar nav={nav} identity={sidebarIdentity} isAdmin={isAdmin} />
        <main className="main">
          <Topbar />
          {children}
        </main>
      </div>
      {/* Portal-wide Quick-Actions radial menu (additive, fixed; desktop only). */}
      <RadialKit />
    </>
  );
}

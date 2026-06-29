"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PanelLeft } from "lucide-react";
import { useDrawerOpen, setDrawer } from "./drawer";
import { ChevronIcon, NavIcon } from "./icons";
import { TerminalLogo } from "./TerminalLogo";
import { UserMenu } from "./user-menu";
import { CreateFolderModal } from "@/components/documents/create-folder-modal";
import { cn } from "@/lib/utils";
import { LIBRARY_ROUTE_PREFIXES, SIDEBAR_STORAGE_KEY as SIDEBAR_KEY } from "@/config/navigation";

export type NavLeaf = { label: string; href: string; iconKey: string; isPrivate?: boolean };
export type NavNode = NavLeaf & { children?: NavLeaf[] };
export interface SidebarNav {
  dashboard: NavLeaf;
  brands: NavNode[];
  resources: NavNode[];
}

type SidebarIdentity = { name: string; email: string; role: string; initials: string; isSuperAdmin: boolean };

// Routes that render their OWN secondary sidebar (Documents Library, …). On these
// the global rail (a) auto-collapses to free space and (b) hides its own duplicate
// nav node. LIBRARY_ROUTE_PREFIXES is the shared source of truth
// (src/config/navigation.ts), also consumed by the layout's pre-paint script.
function isLibraryRoute(pathname: string) {
  return LIBRARY_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Brands split into two visual groups (slug-keyed, position-independent): the
// platform group (IBE suite + APIX) renders below a divider, the rest above.
const PLATFORM_SLUGS = new Set(["ibe-product-suite", "airtuerk-apix"]);

function isActive(pathname: string, href: string, exact: boolean) {
  if (href === "/") return pathname === "/";
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// data-sidebar on <html> is the source of truth for the desktop collapse state
// (set pre-paint from localStorage, updated by the collapse button). Mirror it
// via useSyncExternalStore — same pattern as the theme/orbs/drawer mirrors.
function subscribeSidebar(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-sidebar"],
  });
  return () => observer.disconnect();
}
function getCollapsed() {
  return document.documentElement.dataset.sidebar === "collapsed";
}

/**
 * Public sidebar. ONE component used in both responsive modes (see shell.css
 * breakpoint system): an off-canvas drawer < lg, a fixed collapsible rail ≥ lg.
 * Structure is ARCHITECTURE.md §3. Active state uses .active → --accent.
 */
export function Sidebar({
  nav,
  identity,
  isAdmin,
}: {
  nav: SidebarNav;
  identity: SidebarIdentity | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeSidebar, getCollapsed, () => false);
  const drawerOpen = useDrawerOpen();
  const asideRef = useRef<HTMLElement>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  // Library pages (own secondary sidebar) auto-collapse the global rail for space.
  // We force the data-sidebar attribute on ENTER without writing localStorage, so
  // the user's saved preference is preserved and restored on LEAVE. A manual toggle
  // while inside persists (writes localStorage) and is what we restore to — so user
  // choice wins. Pre-paint collapse (no flash) is handled by the layout script.
  const onLibraryRoute = isLibraryRoute(pathname);
  const wasLibraryRoute = useRef(false);
  useEffect(() => {
    const el = document.documentElement;
    if (onLibraryRoute && !wasLibraryRoute.current) {
      el.dataset.sidebar = "collapsed";
    } else if (!onLibraryRoute && wasLibraryRoute.current) {
      let pref = "expanded";
      try {
        pref = localStorage.getItem(SIDEBAR_KEY) || "expanded";
      } catch {
        // ignore
      }
      el.dataset.sidebar = pref === "collapsed" ? "collapsed" : "expanded";
    }
    wasLibraryRoute.current = onLibraryRoute;
  }, [onLibraryRoute]);

  function toggleCollapse() {
    // Read the live attribute (source of truth) so direction is correct for any
    // click cadence; useSyncExternalStore keeps the button label/icon synced.
    const el = document.documentElement;
    const next = el.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    el.dataset.sidebar = next;
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      // ignore
    }
  }

  // Drawer a11y (mobile/tablet only): when open, move focus into the drawer,
  // trap Tab within it, close on Escape, and return focus to the opener on
  // close. Skipped at lg+ where the sidebar is a fixed rail, not a drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return;
    const aside = asideRef.current;
    if (!aside) return;

    const opener = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        aside.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

    (focusable()[0] ?? aside).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawer("closed");
        return;
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [drawerOpen]);

  // Close the drawer after following any nav link (no-op at lg+).
  const closeDrawer = () => setDrawer("closed");

  // One brand nav item: expandable (with anchor children) when it has children,
  // else a flat link. Shared by both brand groups so the markup stays identical.
  function renderBrandItem(b: NavNode) {
    if (b.children && b.children.length > 0) {
      const open = isActive(pathname, b.href, false);
      const subnavId = `subnav-${b.href.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`;
      return (
        <div key={b.href}>
          <Link
            href={b.href}
            className={`nav-item expandable${open ? " active" : ""}`}
            data-open={open}
            aria-expanded={open}
            aria-controls={subnavId}
            aria-current={open ? "page" : undefined}
            title={collapsed ? b.label : undefined}
            onClick={closeDrawer}
          >
            <span className="icon">
              <NavIcon name={b.iconKey} />
            </span>
            <span className="text">{b.label}</span>
            <span className="chevron">
              <ChevronIcon />
            </span>
          </Link>
          <div id={subnavId} className={`nav-sub${open ? " open" : ""}`}>
            {b.children.map((c) => (
              <a key={c.href} className="nav-item" href={c.href} onClick={closeDrawer}>
                <span className="icon">
                  <NavIcon name={c.iconKey} />
                </span>
                <span className="text">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      );
    }
    return (
      <NavLink
        key={b.href}
        item={b}
        active={isActive(pathname, b.href, false)}
        onNavigate={closeDrawer}
        collapsed={collapsed}
      />
    );
  }

  // Internal Branding is hidden; the rest split into brand vs platform groups.
  const visibleBrands = nav.brands.filter((b) => b.iconKey !== "internal-branding");
  const brandGroup = visibleBrands.filter((b) => !PLATFORM_SLUGS.has(b.iconKey));
  const platformGroup = visibleBrands.filter((b) => PLATFORM_SLUGS.has(b.iconKey));

  return (
    <>
      <div className="sidebar-backdrop" aria-hidden="true" onClick={closeDrawer} />
      <aside
        id="app-sidebar"
        className="sidebar"
        ref={asideRef}
        tabIndex={-1}
        aria-label="Primary navigation"
      >
        <div className="sidebar-inner">
          {/* Fixed top zone: logo + Dashboard (does not scroll). */}
          <div className="sidebar-top">
            <div className="brand-mark">
              <Link href="/" className="brand-logo-link" aria-label="terminal home" onClick={closeDrawer}>
                {/* Single source of truth (currentColor → light/dark). The Link is
                    already labelled, so the logos are decorative (title=""). */}
                <TerminalLogo variant="wordmark" title="" className="brand-logo-wordmark" />
                <TerminalLogo variant="mark" title="" className="brand-logo-icon" />
              </Link>
              <button
                type="button"
                className="collapse-btn"
                onClick={toggleCollapse}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeft color="#717171" aria-hidden />
              </button>
            </div>

            {/* Dashboard */}
            <nav className="nav-section" aria-label="Dashboard">
              <NavLink
                item={nav.dashboard}
                active={isActive(pathname, nav.dashboard.href, true)}
                onNavigate={closeDrawer}
                collapsed={collapsed}
              />
            </nav>
          </div>

          {/* Scrollable middle zone: brand groups + resources. */}
          <div className="sidebar-scroll">
            {/* Brand group (Internal Branding is hidden from the sidebar). */}
            {brandGroup.length > 0 && (
              <nav className="nav-section" aria-label="Brands">
                {brandGroup.map(renderBrandItem)}
              </nav>
            )}

            {/* Divider only when both groups have items. */}
            {brandGroup.length > 0 && platformGroup.length > 0 && (
              <div className="nav-divider" />
            )}

            {/* Platform group: IBE Product Suite + airtuerk APIX. */}
            {platformGroup.length > 0 && (
              <nav className="nav-section" aria-label="Platform">
                {platformGroup.map(renderBrandItem)}
              </nav>
            )}

            <div className="nav-divider" />

            {/* Resources — Document Library is an expandable folder node
                (reuses the brand expandable markup); the rest are flat leaves. */}
            <nav className="nav-section" aria-label="Resources">
              {nav.resources.map((r) => {
                const isDocLib = r.iconKey === "document-library";
                // On a library page (Documents, Presentation Hub) the folder tree
                // lives in that page's OWN secondary sidebar — so keep the global
                // nav item VISIBLE (it never disappears) but drop its expanded
                // folder sub-list here to avoid doubling (D-074/077).
                const onOwnLibraryRoute =
                  LIBRARY_ROUTE_PREFIXES.includes(r.href) &&
                  (pathname === r.href || pathname.startsWith(`${r.href}/`));
                const showSub =
                  !onOwnLibraryRoute && ((r.children && r.children.length > 0) || (isDocLib && isAdmin));
                if (!showSub) {
                  return (
                    <NavLink
                      key={r.href}
                      item={r}
                      active={isActive(pathname, r.href, false)}
                      onNavigate={closeDrawer}
                      collapsed={collapsed}
                    />
                  );
                }
                const open = isActive(pathname, r.href, false);
                const subnavId = `subnav-${r.href.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`;
                return (
                  <div key={r.href}>
                    <Link
                      href={r.href}
                      className={`nav-item expandable${open ? " active" : ""}`}
                      data-open={open}
                      aria-expanded={open}
                      aria-controls={subnavId}
                      aria-current={open ? "page" : undefined}
                      title={collapsed ? r.label : undefined}
                      onClick={closeDrawer}
                    >
                      <span className="icon">
                        <NavIcon name={r.iconKey} />
                      </span>
                      <span className="text">{r.label}</span>
                      <span className="chevron">
                        <ChevronIcon />
                      </span>
                    </Link>
                    <div id={subnavId} className={`nav-sub${open ? " open" : ""}`}>
                      {(r.children ?? []).map((c) => (
                        <Link
                          key={c.href}
                          className={cn("nav-item", c.isPrivate && "is-private")}
                          href={c.href}
                          onClick={closeDrawer}
                        >
                          <span className="icon">
                            <NavIcon name={c.iconKey} />
                          </span>
                          <span className="text">{c.label}</span>
                        </Link>
                      ))}
                      {isDocLib && isAdmin && (
                        <button
                          type="button"
                          className="nav-item"
                          onClick={() => setCreateFolderOpen(true)}
                        >
                          <span className="icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                          <span className="text">Create New Folder</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Fixed bottom zone: the real signed-in user (UserMenu trigger +
              orbs/theme/settings/logout), or a sign-in link for anon visitors. */}
          {identity ? (
            <UserMenu
              name={identity.name}
              email={identity.email}
              role={identity.role}
              initials={identity.initials}
              isSuperAdmin={identity.isSuperAdmin}
            />
          ) : (
            <Link href="/login" className="nav-item" onClick={closeDrawer}>
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </span>
              <span className="text">Sign in</span>
            </Link>
          )}
        </div>
      </aside>

      {isAdmin && (
        <CreateFolderModal
          open={createFolderOpen}
          onClose={() => setCreateFolderOpen(false)}
          parentId={null}
        />
      )}
    </>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
  collapsed = false,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate: () => void;
  /** Collapsed rail → native title acts as the icon tooltip (a styled ::after is
   *  clipped by the sidebar's overflow:hidden scroll). Labels are visible when
   *  expanded, so no title there. */
  collapsed?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`nav-item${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
    >
      <span className="icon">
        <NavIcon name={item.iconKey} />
      </span>
      <span className="text">{item.label}</span>
    </Link>
  );
}

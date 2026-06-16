"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useDrawerOpen, setDrawer } from "./drawer";
import { ChevronIcon, CollapseIcon, NavIcon } from "./icons";

export type NavLeaf = { label: string; href: string; iconKey: string };
export type NavNode = NavLeaf & { children?: NavLeaf[] };
export interface SidebarNav {
  dashboard: NavLeaf;
  brands: NavNode[];
  resources: NavLeaf[];
}

const SIDEBAR_KEY = "terminalv2-sidebar";

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
export function Sidebar({ nav }: { nav: SidebarNav }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeSidebar, getCollapsed, () => false);
  const drawerOpen = useDrawerOpen();
  const asideRef = useRef<HTMLElement>(null);

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
          <div className="brand-mark">
            <div className="logo">at</div>
            <div className="name">
              terminal<span>v2</span>
            </div>
            <button
              type="button"
              className="collapse-btn"
              onClick={toggleCollapse}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CollapseIcon />
            </button>
          </div>

          {/* Dashboard */}
          <nav className="nav-section" aria-label="Dashboard">
            <NavLink
              item={nav.dashboard}
              active={isActive(pathname, nav.dashboard.href, true)}
              onNavigate={closeDrawer}
            />
          </nav>

          <div className="nav-divider" />

          {/* Brands & Products */}
          <nav className="nav-section" aria-label="Brands and products">
            {nav.brands.map((b) => {
              if (b.children && b.children.length > 0) {
                // IBE Product Suite: a LINK to /ibe-product-suite. Its product
                // list expands ONLY while that route is active (route-driven);
                // navigating elsewhere collapses it. Products are in-page anchor
                // links (/ibe-product-suite#<slug>).
                // TODO(Task 3): build the /ibe-product-suite page with the
                // product sections (id="multicheck", …) these anchors target.
                const ibeOpen = isActive(pathname, b.href, false);
                return (
                  <div key={b.href}>
                    <Link
                      href={b.href}
                      className={`nav-item expandable${ibeOpen ? " active" : ""}`}
                      data-open={ibeOpen}
                      aria-expanded={ibeOpen}
                      aria-controls="ibe-subnav"
                      aria-current={ibeOpen ? "page" : undefined}
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
                    <div id="ibe-subnav" className={`nav-sub${ibeOpen ? " open" : ""}`}>
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
                />
              );
            })}
          </nav>

          <div className="nav-divider" />

          {/* Resources */}
          <nav className="nav-section" aria-label="Resources">
            {nav.resources.map((r) => (
              <NavLink
                key={r.href}
                item={r}
                active={isActive(pathname, r.href, false)}
                onNavigate={closeDrawer}
              />
            ))}
          </nav>

          <div className="user-block">
            <div className="avatar">BD</div>
            <div className="meta">
              <div className="name">Buhara Demir</div>
              <div className="role">Admin</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={`nav-item${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className="icon">
        <NavIcon name={item.iconKey} />
      </span>
      <span className="text">{item.label}</span>
    </Link>
  );
}

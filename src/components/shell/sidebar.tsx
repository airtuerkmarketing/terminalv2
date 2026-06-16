"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
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

// data-sidebar on <html> is the source of truth: set pre-paint from localStorage
// (PREFS_SCRIPT in the layout) and updated by the collapse button. Mirror it via
// useSyncExternalStore — same pattern as the theme/orbs toggles — so the button
// reflects the real state, toggles both directions reliably, and there is no
// setState-in-effect or hydration mismatch.
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
 * Collapsible public sidebar (252px ↔ 64px via data-sidebar on <html>).
 * Structure is ARCHITECTURE.md §3: Dashboard | brands (IBE expandable) |
 * resources. Brand/product data is fetched server-side and passed in via `nav`.
 * Active state uses .active → --accent (Quantum Blue).
 */
export function Sidebar({ nav }: { nav: SidebarNav }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeSidebar, getCollapsed, () => false);

  function toggleCollapse() {
    // Read the live attribute (source of truth) so the direction is correct for
    // any click cadence; useSyncExternalStore keeps the button label/icon synced.
    const el = document.documentElement;
    const next = el.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    el.dataset.sidebar = next;
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      // localStorage unavailable — ignore.
    }
  }

  return (
    <aside className="sidebar">
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
          <NavLink item={nav.dashboard} active={isActive(pathname, nav.dashboard.href, true)} />
        </nav>

        <div className="nav-divider" />

        {/* Brands & Products */}
        <nav className="nav-section" aria-label="Brands and products">
          {nav.brands.map((b) => {
            if (b.children && b.children.length > 0) {
              // IBE Product Suite: a LINK to /ibe-product-suite. Its product list
              // is expanded ONLY while that route is active (route-driven, not a
              // manual toggle) — navigating elsewhere collapses it. The products
              // are in-page anchor links (/ibe-product-suite#<slug>).
              // TODO(Task 3): build the /ibe-product-suite page with the product
              // sections (id="multicheck", id="cockpit", …) these anchors target.
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
                      <a key={c.href} className="nav-item" href={c.href}>
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
            return <NavLink key={b.href} item={b} active={isActive(pathname, b.href, false)} />;
          })}
        </nav>

        <div className="nav-divider" />

        {/* Resources */}
        <nav className="nav-section" aria-label="Resources">
          {nav.resources.map((r) => (
            <NavLink key={r.href} item={r} active={isActive(pathname, r.href, false)} />
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
  );
}

function NavLink({ item, active }: { item: NavLeaf; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`nav-item${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="icon">
        <NavIcon name={item.iconKey} />
      </span>
      <span className="text">{item.label}</span>
    </Link>
  );
}

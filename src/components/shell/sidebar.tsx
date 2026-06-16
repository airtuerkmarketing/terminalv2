"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

/**
 * Collapsible public sidebar (252px ↔ 64px via data-sidebar on <html>).
 * Structure is ARCHITECTURE.md §3: Dashboard | brands (IBE expandable with its
 * products nested) | resources. Brand/product data is fetched server-side and
 * passed in via `nav`. Active state uses .active → --accent (Quantum Blue).
 */
export function Sidebar({ nav }: { nav: SidebarNav }) {
  const pathname = usePathname();

  // IBE products section starts expanded (matches the mockup default).
  const [open, setOpen] = useState(true);

  function toggleCollapse() {
    const el = document.documentElement;
    const next = el.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    el.dataset.sidebar = next;
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      // ignore
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
            aria-label="Collapse or expand sidebar"
            title="Collapse sidebar"
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
          {nav.brands.map((b) =>
            b.children && b.children.length > 0 ? (
              <div key={b.href}>
                <button
                  type="button"
                  className="nav-item expandable"
                  data-open={open}
                  aria-expanded={open}
                  aria-controls="ibe-subnav"
                  onClick={() => setOpen((v) => !v)}
                >
                  <span className="icon">
                    <NavIcon name={b.iconKey} />
                  </span>
                  <span className="text">{b.label}</span>
                  <span className="chevron">
                    <ChevronIcon />
                  </span>
                </button>
                <div id="ibe-subnav" className={`nav-sub${open ? " open" : ""}`}>
                  {b.children.map((c) => (
                    <NavLink key={c.href} item={c} active={isActive(pathname, c.href, true)} />
                  ))}
                </div>
              </div>
            ) : (
              <NavLink key={b.href} item={b} active={isActive(pathname, b.href, false)} />
            )
          )}
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

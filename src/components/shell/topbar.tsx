"use client";

import { useDrawerOpen, setDrawer } from "./drawer";
import { MenuIcon } from "./icons";

/**
 * Topbar: just the hamburger (mobile/tablet only) that opens the sidebar
 * drawer. The ambient-orbs / theme / settings actions moved into the sidebar's
 * user menu (see UserMenu); the old placeholder search field was removed once
 * the dashboard hero provided the real Such+KI-Box.
 */
export function Topbar() {
  const drawerOpen = useDrawerOpen();

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn hamburger"
        onClick={() => setDrawer("open")}
        aria-label="Open navigation menu"
        aria-expanded={drawerOpen}
        aria-controls="app-sidebar"
      >
        <MenuIcon />
      </button>
    </header>
  );
}

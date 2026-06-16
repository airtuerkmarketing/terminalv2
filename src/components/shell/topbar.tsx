"use client";

import { useSyncExternalStore } from "react";
import { ExternalIcon, OrbsIcon, SearchIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

const ORBS_KEY = "terminalv2-orbs";

// data-orbs on <html> drives orb visibility (shell.css). Mirror it via
// useSyncExternalStore so the toggle's pressed state stays in sync.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-orbs"],
  });
  return () => observer.disconnect();
}

function getOrbsOn() {
  return document.documentElement.dataset.orbs !== "off";
}

/**
 * Topbar: glass search field (placeholder until the Phase 7 search), the
 * ambient-orbs toggle, the theme toggle, and a link out to the live site.
 */
export function Topbar() {
  const orbsOn = useSyncExternalStore(subscribe, getOrbsOn, () => true);

  function toggleOrbs() {
    document.documentElement.dataset.orbs = orbsOn ? "off" : "on";
    try {
      localStorage.setItem(ORBS_KEY, orbsOn ? "off" : "on");
    } catch {
      // ignore
    }
  }

  return (
    <header className="topbar">
      <div className="search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search brands, assets, documents..."
          aria-label="Search"
        />
        <span className="key">⌘K</span>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={toggleOrbs}
          aria-pressed={orbsOn}
          aria-label={orbsOn ? "Turn ambient orbs off" : "Turn ambient orbs on"}
          title="Toggle ambient orbs"
        >
          <OrbsIcon />
        </button>
        <ThemeToggle />
        <a
          className="icon-btn"
          href="https://airtuerk.de"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open airtuerk.de in a new tab"
          title="airtuerk.de"
        >
          <ExternalIcon />
        </a>
      </div>
    </header>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import { OrbsIcon, SettingsIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { UserSettingsModal } from "./user-settings-modal";

const ORBS_KEY = "terminalv2-orbs";

// data-orbs on <html> drives orb visibility (shell.css). Mirror it via
// useSyncExternalStore so the toggle's pressed state stays in sync — same
// pattern as the theme/sidebar mirrors. (Moved here from the topbar.)
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
 * Bottom-of-sidebar action row (relocated from the topbar): ambient-orbs
 * toggle, theme toggle, and a settings button that opens the user settings
 * modal. Sits directly below the user block.
 */
export function SidebarActions() {
  const orbsOn = useSyncExternalStore(subscribe, getOrbsOn, () => true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function toggleOrbs() {
    document.documentElement.dataset.orbs = orbsOn ? "off" : "on";
    try {
      localStorage.setItem(ORBS_KEY, orbsOn ? "off" : "on");
    } catch {
      // ignore
    }
  }

  return (
    <div className="sidebar-actions">
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

      <button
        type="button"
        className="icon-btn"
        onClick={() => setSettingsOpen(true)}
        aria-haspopup="dialog"
        aria-label="Open settings"
        title="Settings"
      >
        <SettingsIcon />
      </button>

      <UserSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

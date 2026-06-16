"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "ios18-light" | "ios18-dark";
const STORAGE_KEY = "terminalv2-theme";

// data-theme on <html> is the source of truth (set pre-paint from localStorage,
// updated here). Read it via useSyncExternalStore so the icon stays in sync
// without setState-in-effect and without a hydration mismatch.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "ios18-dark"
    ? "ios18-dark"
    : "ios18-light";
}

/** Toggles data-theme between ios18-light and ios18-dark and persists it. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "ios18-light" as Theme);

  function toggle() {
    const next: Theme = theme === "ios18-light" ? "ios18-dark" : "ios18-light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — ignore.
    }
  }

  const toDark = theme === "ios18-light";
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={toDark ? "Switch to dark theme" : "Switch to light theme"}
      title={toDark ? "Switch to dark theme" : "Switch to light theme"}
    >
      {toDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

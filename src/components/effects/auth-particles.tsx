"use client";

import { useSyncExternalStore } from "react";
import { Particles } from "./particles";

// Theme-aware particle backdrop for the auth pages. The base <Particles>
// converts a hex colour to rgb internally, so it can't read a CSS variable —
// instead we mirror the live data-theme attribute on <html> (same pattern as
// the sidebar/orbs mirrors) and feed it black on light, white on dark, so the
// field reads on both --bg values.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
function getDark() {
  return document.documentElement.dataset.theme === "ios18-dark";
}

export function AuthParticles() {
  const dark = useSyncExternalStore(subscribe, getDark, () => false);
  return (
    <Particles
      className="login-particles"
      quantity={350}
      ease={50}
      color={dark ? "#FFFFFF" : "#000000"}
      size={0.8}
      refresh={false}
    />
  );
}

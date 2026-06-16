"use client";

import { useSyncExternalStore } from "react";

// Mobile/tablet drawer open state, mirrored on the data-drawer attribute on
// <html> (open|closed). Same robust pattern as the collapse/theme/orbs mirrors:
// useSyncExternalStore reads it, plain DOM writes set it — no setState-in-effect,
// no hydration mismatch. Drawer state is ephemeral (never persisted): it always
// starts closed on load (absent attribute === closed).
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-drawer"],
  });
  return () => observer.disconnect();
}

function getOpen() {
  return document.documentElement.dataset.drawer === "open";
}

/** Reactive drawer-open boolean. */
export function useDrawerOpen() {
  return useSyncExternalStore(subscribe, getOpen, () => false);
}

/** Open or close the mobile/tablet drawer. */
export function setDrawer(state: "open" | "closed") {
  document.documentElement.dataset.drawer = state;
}

"use client";

import { useSyncExternalStore } from "react";

// Deterministic dd.mm.yyyy from the ISO date part — no locale/timezone drift, so
// it's identical on server and client (hydration-safe). Decoupled copy of the
// Document Library's relative-time (kept separate so the hub never imports it).
function absolute(iso: string): string {
  const p = iso.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return absolute(iso);
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return absolute(iso);
}

const noopSubscribe = () => () => {};

/**
 * Absolute date during SSR + first paint, then "3 hrs ago" after hydration —
 * via useSyncExternalStore (no setState-in-effect).
 */
export function RelativeTime({ iso }: { iso: string }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {mounted ? relative(iso) : absolute(iso)}
    </time>
  );
}

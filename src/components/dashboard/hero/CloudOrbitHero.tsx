"use client";

import { useSyncExternalStore } from "react";
import "@/styles/dashboard-hero.css";
import { CloudOrbit, OrbitingImage } from "@/components/ui/cloud-orbit";
import { CENTER_IMAGES, ORBIT_LOGOS } from "@/components/dashboard/hero-data";

/* Hero visual: LLM providers orbiting the airtuerk centre (BAU-Auftrag §4).
 * Anbieter-neutral — the AI layer is swappable (Claude first, others later).
 * The centre uses the native CloudOrbit images[] crossfade (airtuerk ↔ terminal
 * SVG wordmarks) so it gets the badtz-ui glass bubble + crossfade like the
 * reference demo. Drop-shadow on the coins is added in dashboard-hero.css
 * (the ported component ships only the inset highlight). Hidden < 768px. */

const ORBIT_RADIUS = 132;
const LOGO_SIZE = 46;
const ORBIT_SPEED = 30; // seconds per revolution — uniform ring keeps formation
const CENTER_SIZE = 120;
const CROSSFADE = 3; // seconds per centre crossfade (badtz-ui demo default)

// Desktop gate (≥768px) via useSyncExternalStore — mirrors the reduced-motion
// mirror in folder-card-3d.tsx. Server snapshot is false, so the orbit is never
// in the SSR/mobile HTML; on desktop it mounts after hydration (no mismatch).
function subscribeDesktop(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getDesktop() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(min-width: 768px)").matches
    : false;
}
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktop, () => false);
}

export function CloudOrbitHero() {
  const isDesktop = useIsDesktop();
  const count = ORBIT_LOGOS.length;

  // Mobile (<768px) never mounts the orbit subtree — reclaims the motion +
  // image budget the old CSS `display:none` left running in the background.
  if (!isDesktop) return null;

  return (
    <div className="dh-orbit" aria-hidden="true">
      <CloudOrbit duration={CROSSFADE} size={CENTER_SIZE} images={CENTER_IMAGES}>
        {ORBIT_LOGOS.map((logo, i) => (
          <OrbitingImage
            key={logo.name}
            images={[logo]}
            radius={ORBIT_RADIUS}
            size={LOGO_SIZE}
            speed={ORBIT_SPEED}
            startAt={i / count}
          />
        ))}
      </CloudOrbit>
    </div>
  );
}

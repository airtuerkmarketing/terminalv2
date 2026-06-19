"use client";

import "@/styles/dashboard-hero.css";
import { CloudOrbit, OrbitingImage } from "@/components/ui/cloud-orbit";
import { ORBIT_LOGOS } from "@/components/dashboard/hero-data";

/* Hero visual: LLM providers orbiting the airtuerk centre (BAU-Auftrag §4).
 * Anbieter-neutral — the AI layer is swappable (Claude first, others later).
 * Hidden < 768px (the box stays); see dashboard-hero.css. */

const ORBIT_RADIUS = 132;
const LOGO_SIZE = 46;
const ORBIT_SPEED = 30; // seconds per revolution — uniform ring keeps formation

export function CloudOrbitHero() {
  const count = ORBIT_LOGOS.length;

  return (
    <div className="dh-orbit" aria-hidden="true">
      <CloudOrbit className="dh-orbit-stage">
        {/* Centre: airtuerk wordmark. TODO(stage 2): swap for the real logo
            asset once a raster wordmark is uploaded to public.assets (every
            brand's logo_asset_id is currently NULL — only ZIP/PDF packages
            exist). Matches the sidebar's text-wordmark treatment for now. */}
        <div className="dh-orbit-center">
          <span className="dh-orbit-center-mark">airtuerk</span>
        </div>

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

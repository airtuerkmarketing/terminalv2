import type { Metadata } from "next";
import { pageMetadata } from "@/components/page-view";
// CloudOrbitHero (LLM-provider orbit) is PARKED — replaced by GreetingOrbit. The
// component + hero-data ORBIT_LOGOS/CENTER_IMAGES + dashboard-hero.css .dh-orbit
// rules are kept in the tree (not deleted) in case we want the orbit back.
import { GreetingOrbit } from "@/components/dashboard/hero/GreetingOrbit";
import { SearchAIBox } from "@/components/dashboard/hero/SearchAIBox";

// "/" is the dashboard landing (Stage 1): Cloud Orbit hero + Such+KI-Box +
// Quick-Chips. It replaces the generic block-rendered "/" page; Bento-Cards
// (Konfetti, Jubiläen, Top-Fragen, Recent Pages, Brand-Bento) come in later
// stages below the box. Metadata still comes from the "/" page row.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/");
}

export default function Home() {
  return (
    <div className="main-inner">
      <div className="dh-page">
        <GreetingOrbit />
        <SearchAIBox />
        {/* PLATZHALTER: hier kommen später Bento-Cards (Stufe 3+) */}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { pageMetadata } from "@/components/page-view";
import { getIdentity } from "@/lib/auth";
// CloudOrbitHero (LLM-provider orbit) is PARKED — replaced by GreetingOrbit. The
// component + hero-data ORBIT_LOGOS/CENTER_IMAGES + dashboard-hero.css .dh-orbit
// rules are kept in the tree (not deleted) in case we want the orbit back.
import { GreetingOrbit } from "@/components/dashboard/hero/GreetingOrbit";
import { SearchAIBox } from "@/components/dashboard/hero/SearchAIBox";
import { QuickGrabs } from "@/components/dashboard/quickgrabs/QuickGrabs";

// "/" is the dashboard landing (Stage 1): Cloud Orbit hero + Such+KI-Box +
// Quick-Chips. It replaces the generic block-rendered "/" page; Bento-Cards
// (Konfetti, Jubiläen, Top-Fragen, Recent Pages, Brand-Bento) come in later
// stages below the box. Metadata still comes from the "/" page row.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/");
}

export default async function Home() {
  // First name for the greeting: team_member first_name, else the first word of
  // the profile full_name, else null → GreetingOrbit shows "Kollege". getIdentity
  // is React-cached, so this shares the layout's existing read (no extra DB hit).
  const identity = await getIdentity();
  const firstName = identity?.firstName ?? identity?.fullName?.split(" ")[0] ?? null;

  return (
    <div className="main-inner">
      <div className="dh-page">
        <GreetingOrbit name={firstName} />
        <SearchAIBox />
        <QuickGrabs />
      </div>
    </div>
  );
}

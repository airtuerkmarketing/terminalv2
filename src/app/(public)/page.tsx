import type { Metadata } from "next";
import { pageMetadata } from "@/components/page-view";
import { CloudOrbitHero } from "@/components/dashboard/hero/CloudOrbitHero";
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
    <div className="dh-page">
      <CloudOrbitHero />
      <SearchAIBox />
      {/* PLATZHALTER: hier kommen später Bento-Cards (Stufe 3+) */}
    </div>
  );
}

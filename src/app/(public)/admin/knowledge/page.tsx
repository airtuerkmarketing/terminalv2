import { notFound } from "next/navigation";
import { getIdentity } from "@/lib/auth";
import {
  getKnowledgeStats,
  getQualityStats,
  listChunks,
  listCorrections,
  listSuggestions,
  listVocabulary,
} from "@/lib/knowledge/queries";
import { EMPTY_FILTERS, type ChunkLayer, type TagAxis } from "@/lib/knowledge/types";
import { KnowledgeApp } from "@/components/knowledge/knowledge-app";

export const metadata = { title: "Knowledge base" };

type SearchParams = { [key: string]: string | string[] | undefined };
type Tab = "sources" | "reviews" | "quality" | "taxonomy";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Defense in depth: page-level gate in addition to every query's gate().
  // D-111: ai_admin runs the knowledge workflow (reviews/sources/quality); the
  // Taxonomy tab stays super_admin-only and is hidden in the UI for non-super.
  const identity = await getIdentity();
  if (!identity?.isSuperAdmin && !identity?.isAiAdmin) notFound();
  const isSuperAdmin = identity.isSuperAdmin;

  const sp = await searchParams;
  const tabRaw = typeof sp.tab === "string" ? sp.tab : "sources";
  const requestedTab = (["sources", "reviews", "quality", "taxonomy"].includes(tabRaw) ? tabRaw : "sources") as Tab;
  // Taxonomy is super_admin-only (Q3); an ai_admin deep-linking ?tab=taxonomy
  // falls back to Sources.
  const tab: Tab = requestedTab === "taxonomy" && !isSuperAdmin ? "sources" : requestedTab;
  const search = typeof sp.search === "string" ? sp.search : "";
  const layerParam = typeof sp.layer === "string" ? sp.layer : "";
  const layers = layerParam
    .split(",")
    .filter((l): l is ChunkLayer => l === "company" || l === "confluence" || l === "brand");
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const parseList = (v: string | string[] | undefined) =>
    typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const axes: Record<TagAxis, string[]> = {
    topic: parseList(sp.topic),
    airline: parseList(sp.airline),
    department: parseList(sp.department),
    provider: parseList(sp.provider),
    brand: parseList(sp.brand),
  };

  const [stats, sources, corrections, quality, vocab, suggestions] = await Promise.all([
    getKnowledgeStats(),
    listChunks(EMPTY_FILTERS),
    listCorrections(),
    getQualityStats(),
    listVocabulary(),
    listSuggestions(),
  ]);

  return (
    <KnowledgeApp
      stats={stats}
      chunks={sources.chunks}
      corrections={corrections}
      quality={quality}
      vocab={vocab}
      suggestions={suggestions}
      initialTab={tab}
      initialSourceFilters={{ search, layers, sort, axes }}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

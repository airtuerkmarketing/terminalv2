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
import { EMPTY_FILTERS, type ChunkLayer } from "@/lib/knowledge/types";
import { KnowledgeApp } from "@/components/knowledge/knowledge-app";

export const metadata = { title: "Wissensbasis" };

type SearchParams = { [key: string]: string | string[] | undefined };
type Tab = "sources" | "reviews" | "quality" | "taxonomy";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Defense in depth: page-level gate in addition to every query's requireSuperAdmin.
  const identity = await getIdentity();
  if (!identity?.isSuperAdmin) notFound();

  const sp = await searchParams;
  const tabRaw = typeof sp.tab === "string" ? sp.tab : "sources";
  const tab = (["sources", "reviews", "quality", "taxonomy"].includes(tabRaw) ? tabRaw : "sources") as Tab;
  const search = typeof sp.search === "string" ? sp.search : "";
  const layerParam = typeof sp.layer === "string" ? sp.layer : "";
  const layers = layerParam
    .split(",")
    .filter((l): l is ChunkLayer => l === "company" || l === "confluence" || l === "brand");
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";

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
      initialSourceFilters={{ search, layers, sort }}
    />
  );
}

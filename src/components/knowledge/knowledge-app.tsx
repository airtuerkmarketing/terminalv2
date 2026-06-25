"use client";

import "@/styles/knowledge.css";
import { useState } from "react";
import { BookOpen, ClipboardCheck, BarChart3, Tags } from "lucide-react";
import { SourcesTab } from "./sources-tab";
import { ReviewsTab } from "./reviews-tab";
import { QualityTab } from "./quality-tab";
import { TaxonomyTab } from "./taxonomy-tab";
import type {
  ChunkLayer,
  CorrectionRow,
  KnowledgeChunk,
  KnowledgeStats,
  QualityStats,
  TagSuggestion,
  VocabTerm,
} from "@/lib/knowledge/types";

type Tab = "sources" | "reviews" | "quality" | "taxonomy";

function fmtAge(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3.6e6);
  if (h < 1) return "< 1 Std";
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.floor(h / 24)} T`;
}

export interface KnowledgeAppProps {
  stats: KnowledgeStats;
  chunks: KnowledgeChunk[];
  corrections: { pending: CorrectionRow[]; history: CorrectionRow[] };
  quality: QualityStats;
  vocab: VocabTerm[];
  suggestions: TagSuggestion[];
  initialTab: Tab;
  initialSourceFilters: { search: string; layers: ChunkLayer[]; sort: string };
}

export function KnowledgeApp(props: KnowledgeAppProps) {
  const { stats, chunks, corrections, quality, vocab, suggestions } = props;
  const [tab, setTab] = useState<Tab>(props.initialTab);

  function go(t: Tab) {
    setTab(t);
    const p = new URLSearchParams(window.location.search);
    p.set("tab", t);
    window.history.replaceState(null, "", `?${p.toString()}`);
  }

  return (
    <div className="kb-page">
      <header className="kb-head">
        <h1 className="kb-title">Wissensbasis</h1>
        <p className="kb-subtitle">
          {stats.totalChunks} Chunks · {stats.byLayer.company} Identität · {stats.byLayer.confluence} Confluence ·{" "}
          {stats.byLayer.brand} Brands
        </p>
      </header>

      <div className="kb-kpis">
        <div className="kb-kpi">
          <span className="kb-kpi-value">{stats.totalChunks}</span>
          <span className="kb-kpi-label">Chunks gesamt</span>
        </div>
        <div className={`kb-kpi ${stats.pendingReviews > 0 ? "kb-kpi--alert" : ""}`}>
          <span className="kb-kpi-value">{stats.pendingReviews}</span>
          <span className="kb-kpi-label">Offene Reviews</span>
        </div>
        <div className="kb-kpi">
          <span className="kb-kpi-value">{stats.goldSetPct}%</span>
          <span className="kb-kpi-label">Gold-Set</span>
        </div>
        <div className="kb-kpi">
          <span className="kb-kpi-value">{fmtAge(stats.lastEmbeddingRun)}</span>
          <span className="kb-kpi-label">Letztes Embedding</span>
        </div>
      </div>

      <div className="kb-layerbadges">
        {Object.entries(stats.sourceTypeCounts).map(([k, v]) => (
          <span key={k} className="kb-layerbadge">
            {k} <b>{v}</b>
          </span>
        ))}
        <span className="kb-layerbadge">
          Übernommene Korrekturen <b>{stats.approvedCorrections}</b>
        </span>
      </div>

      <div className="kb-tabs" role="tablist" aria-label="Wissensbasis-Bereiche">
        <button role="tab" aria-selected={tab === "sources"} className="kb-tab" onClick={() => go("sources")}>
          <BookOpen size={15} /> Quellen
        </button>
        <button role="tab" aria-selected={tab === "reviews"} className="kb-tab" onClick={() => go("reviews")}>
          <ClipboardCheck size={15} /> Reviews
          {corrections.pending.length > 0 && (
            <span className="kb-tab-count kb-tab-count--warn">{corrections.pending.length}</span>
          )}
        </button>
        <button role="tab" aria-selected={tab === "quality"} className="kb-tab" onClick={() => go("quality")}>
          <BarChart3 size={15} /> Qualität
        </button>
        <button role="tab" aria-selected={tab === "taxonomy"} className="kb-tab" onClick={() => go("taxonomy")}>
          <Tags size={15} /> Taxonomie
        </button>
      </div>

      <div role="tabpanel">
        {tab === "sources" && <SourcesTab chunks={chunks} stats={stats} initial={props.initialSourceFilters} />}
        {tab === "reviews" && <ReviewsTab pending={corrections.pending} history={corrections.history} />}
        {tab === "quality" && <QualityTab quality={quality} />}
        {tab === "taxonomy" && <TaxonomyTab vocab={vocab} suggestions={suggestions} />}
      </div>
    </div>
  );
}

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
  TagAxis,
  TagSuggestion,
  VocabTerm,
} from "@/lib/knowledge/types";

type Tab = "sources" | "reviews" | "quality" | "taxonomy";

function fmtAge(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3.6e6);
  if (h < 1) return "< 1 hr";
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export interface KnowledgeAppProps {
  stats: KnowledgeStats;
  chunks: KnowledgeChunk[];
  corrections: { pending: CorrectionRow[]; history: CorrectionRow[] };
  quality: QualityStats;
  vocab: VocabTerm[];
  suggestions: TagSuggestion[];
  initialTab: Tab;
  initialSourceFilters: { search: string; layers: ChunkLayer[]; sort: string; axes: Record<TagAxis, string[]> };
  /** Taxonomy tab is super_admin-only (D-111 Q3); ai_admin sees the other tabs. */
  isSuperAdmin: boolean;
}

export function KnowledgeApp(props: KnowledgeAppProps) {
  const { stats, chunks, corrections, quality, vocab, suggestions, isSuperAdmin } = props;
  const [tab, setTab] = useState<Tab>(props.initialTab);

  function go(t: Tab) {
    // Taxonomy is super_admin-only — ignore any attempt to switch there otherwise.
    if (t === "taxonomy" && !isSuperAdmin) return;
    setTab(t);
    const p = new URLSearchParams(window.location.search);
    p.set("tab", t);
    window.history.replaceState(null, "", `?${p.toString()}`);
  }

  return (
    <div className="kb-page">
      <header className="kb-head">
        <h1 className="kb-title">Knowledge base</h1>
        <p className="kb-subtitle">
          {stats.totalChunks} Chunks · {stats.byLayer.company} Identity · {stats.byLayer.confluence} Confluence ·{" "}
          {stats.byLayer.brand} Brands
        </p>
      </header>

      <div className="kb-kpis">
        <div className="kb-kpi">
          <span className="kb-kpi-value">{stats.totalChunks}</span>
          <span className="kb-kpi-label">Total chunks</span>
        </div>
        <div className={`kb-kpi ${stats.pendingReviews > 0 ? "kb-kpi--alert" : ""}`}>
          <span className="kb-kpi-value">{stats.pendingReviews}</span>
          <span className="kb-kpi-label">Open reviews</span>
        </div>
        <div className="kb-kpi">
          <span className="kb-kpi-value">{stats.goldSetPct}%</span>
          <span className="kb-kpi-label">Gold-Set</span>
        </div>
        <div className="kb-kpi">
          <span className="kb-kpi-value">{fmtAge(stats.lastEmbeddingRun)}</span>
          <span className="kb-kpi-label">Last embedding</span>
        </div>
      </div>

      <div className="kb-layerbadges">
        {Object.entries(stats.sourceTypeCounts).map(([k, v]) => (
          <span key={k} className="kb-layerbadge">
            {k} <b>{v}</b>
          </span>
        ))}
        <span className="kb-layerbadge">
          Approved corrections <b>{stats.approvedCorrections}</b>
        </span>
      </div>

      <div className="kb-tabs" role="tablist" aria-label="Knowledge base areas">
        <button role="tab" aria-selected={tab === "sources"} className="kb-tab" onClick={() => go("sources")}>
          <BookOpen size={15} /> Sources
        </button>
        <button role="tab" aria-selected={tab === "reviews"} className="kb-tab" onClick={() => go("reviews")}>
          <ClipboardCheck size={15} /> Reviews
          {corrections.pending.length > 0 && (
            <span className="kb-tab-count kb-tab-count--warn">{corrections.pending.length}</span>
          )}
        </button>
        <button role="tab" aria-selected={tab === "quality"} className="kb-tab" onClick={() => go("quality")}>
          <BarChart3 size={15} /> Quality
        </button>
        {isSuperAdmin && (
          <button role="tab" aria-selected={tab === "taxonomy"} className="kb-tab" onClick={() => go("taxonomy")}>
            <Tags size={15} /> Taxonomy
          </button>
        )}
      </div>

      <div role="tabpanel">
        {tab === "sources" && (
          <SourcesTab
            chunks={chunks}
            stats={stats}
            vocab={vocab}
            initial={props.initialSourceFilters}
            onManageTags={() => go("taxonomy")}
          />
        )}
        {tab === "reviews" && <ReviewsTab pending={corrections.pending} history={corrections.history} />}
        {tab === "quality" && <QualityTab quality={quality} />}
        {tab === "taxonomy" && isSuperAdmin && <TaxonomyTab vocab={vocab} suggestions={suggestions} />}
      </div>
    </div>
  );
}

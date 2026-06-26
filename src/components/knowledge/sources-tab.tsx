"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, AlertCircle, Pencil, History, X, Plus, Lock } from "lucide-react";
import { inferContentShape } from "@/lib/knowledge/shape";
import { EditChunkModal } from "./edit-chunk-modal";
import { AuditDrawer } from "./audit-drawer";
import { CreateContextModal } from "./create-context-modal";
import { KbFilterDropdown, type FilterOption } from "./kb-filter-dropdown";
import { KbPresets, type FilterState } from "./kb-presets";
import {
  AXIS_TO_KEY,
  TAG_AXES,
  type ChunkLayer,
  type KnowledgeChunk,
  type KnowledgeStats,
  type TagAxis,
  type VocabTerm,
} from "@/lib/knowledge/types";

const PAGE_SIZE = 25;

const LAYER_LABEL: Record<ChunkLayer, string> = {
  company: "Identity",
  confluence: "Confluence",
  brand: "Brands",
};

const AXIS_LABEL: Record<TagAxis, string> = {
  topic: "Topics",
  airline: "Airlines",
  department: "Departments",
  provider: "Provider",
  brand: "Brands",
};

function MiniTable({ text }: { text: string }) {
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("|"))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  const body = rows.filter((r) => !r.every((c) => /^-{2,}:?$|^:?-{2,}$|^-+$/.test(c) || c === ""));
  if (body.length === 0) return <p className="kb-card-body">{text}</p>;
  const [head, ...rest] = body;
  return (
    <table className="kb-table">
      <thead>
        <tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rest.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function ChunkBody({ chunk }: { chunk: KnowledgeChunk }) {
  const [expanded, setExpanded] = useState(false);
  const shape = inferContentShape(chunk.content);

  if (shape === "table") return <MiniTable text={chunk.content} />;
  if (shape === "bullets") {
    const items = chunk.content
      .split("\n")
      .map((l) => l.trim().replace(/^([-*•]|\d+[.)])\s+/, ""))
      .filter(Boolean);
    return (
      <ul className="kb-bullets">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    );
  }
  if (shape === "quote") return <div className="kb-card-body kb-shape-quote">{chunk.content}</div>;

  const long = chunk.content.length > 280;
  return (
    <div>
      <div className={`kb-card-body kb-shape-prose ${long && !expanded ? "kb-collapsed" : ""}`}>
        {chunk.content}
        {chunk.truncated && !expanded ? "…" : ""}
      </div>
      {long && (
        <button className="kb-expand" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function SourcesTab({
  chunks,
  stats,
  vocab,
  initial,
  onManageTags,
}: {
  chunks: KnowledgeChunk[];
  stats: KnowledgeStats;
  vocab: VocabTerm[];
  initial: { search: string; layers: ChunkLayer[]; sort: string; axes: Record<TagAxis, string[]> };
  onManageTags: () => void;
}) {
  const [search, setSearch] = useState(initial.search);
  const [layers, setLayers] = useState<Set<ChunkLayer>>(new Set(initial.layers));
  const [sort, setSort] = useState(initial.sort || "newest");
  const [axisSel, setAxisSel] = useState<Record<TagAxis, string[]>>(initial.axes);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<KnowledgeChunk | null>(null);
  const [auditing, setAuditing] = useState<KnowledgeChunk | null>(null);
  const [creating, setCreating] = useState(false);

  // Per-axis dropdown options with live counts from the loaded corpus.
  const axisOptions = useMemo(() => {
    const out = {} as Record<TagAxis, FilterOption[]>;
    for (const axis of TAG_AXES) {
      const key = AXIS_TO_KEY[axis];
      const counts = new Map<string, number>();
      for (const c of chunks) for (const v of c.tags[key] ?? []) counts.set(v, (counts.get(v) ?? 0) + 1);
      out[axis] = vocab
        .filter((t) => t.axis === axis)
        .map((t) => ({ value: t.value, label: t.labelDe, count: counts.get(t.value) ?? 0 }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }
    return out;
  }, [chunks, vocab]);

  function setAxis(axis: TagAxis, next: string[]) {
    setAxisSel((prev) => ({ ...prev, [axis]: next }));
  }
  function toggleLayer(l: ChunkLayer) {
    setLayers((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });
  }
  function clearAll() {
    setLayers(new Set());
    setAxisSel({ topic: [], airline: [], department: [], provider: [], brand: [] });
    setSearch("");
  }
  function applyPreset(s: FilterState) {
    setSearch(s.search);
    setLayers(new Set(s.layers));
    setSort(s.sort);
    setAxisSel({
      topic: s.axes.topic ?? [],
      airline: s.axes.airline ?? [],
      department: s.axes.department ?? [],
      provider: s.axes.provider ?? [],
      brand: s.axes.brand ?? [],
    });
  }

  // Reflect filter state to the URL (shareable) without re-fetching.
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      p.set("tab", "sources");
      search ? p.set("search", search) : p.delete("search");
      layers.size ? p.set("layer", [...layers].join(",")) : p.delete("layer");
      sort !== "newest" ? p.set("sort", sort) : p.delete("sort");
      for (const axis of TAG_AXES) {
        axisSel[axis].length ? p.set(axis, axisSel[axis].join(",")) : p.delete(axis);
      }
      window.history.replaceState(null, "", `?${p.toString()}`);
    }, 250);
    return () => clearTimeout(t);
  }, [search, layers, sort, axisSel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const axisMatch = (have: string[] | undefined, want: string[]) =>
      want.length === 0 || (have ?? []).some((v) => want.includes(v));
    let out = chunks.filter(
      (c) =>
        (layers.size === 0 || layers.has(c.layer)) &&
        axisMatch(c.tags.topics, axisSel.topic) &&
        axisMatch(c.tags.airlines, axisSel.airline) &&
        axisMatch(c.tags.departments, axisSel.department) &&
        axisMatch(c.tags.providers, axisSel.provider) &&
        axisMatch(c.tags.brands, axisSel.brand),
    );
    if (q) out = out.filter((c) => c.content.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
    out = [...out].sort((a, b) => {
      if (sort === "most-retrieved") return b.retrievedCount - a.retrievedCount;
      const cmp = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      return sort === "oldest" ? cmp : -cmp;
    });
    return out;
  }, [chunks, search, layers, sort, axisSel]);

  // Active-filter chips (layer + tag axes).
  const activeChips: { label: string; value: string; remove: () => void }[] = [];
  for (const l of layers)
    activeChips.push({ label: "Layer", value: LAYER_LABEL[l], remove: () => toggleLayer(l) });
  for (const axis of TAG_AXES)
    for (const v of axisSel[axis])
      activeChips.push({
        label: AXIS_LABEL[axis],
        value: vocab.find((t) => t.axis === axis && t.value === v)?.labelDe ?? v,
        remove: () => setAxis(axis, axisSel[axis].filter((x) => x !== v)),
      });

  useEffect(() => setPage(0), [search, layers, sort, axisSel]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="kb-toolbar">
        {TAG_AXES.map((axis) => (
          <KbFilterDropdown
            key={axis}
            label={AXIS_LABEL[axis]}
            options={axisOptions[axis]}
            selected={axisSel[axis]}
            onChange={(next) => setAxis(axis, next)}
            onManage={onManageTags}
          />
        ))}
        <button className="kb-btn kb-btn--primary" style={{ marginLeft: "auto" }} onClick={() => setCreating(true)}>
          <Plus size={14} /> New entry
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="kb-chipstack">
          <span className="kb-chipstack-label">Active:</span>
          {activeChips.map((c, i) => (
            <button key={i} className="kb-filterchip" onClick={c.remove}>
              <span className="kb-filterchip-axis">{c.label}</span>
              {c.value}
              <X size={12} aria-hidden="true" />
            </button>
          ))}
          <button className="kb-chipstack-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      <div className="kb-toolbar">
        <input
          className="kb-search"
          placeholder="Search chunks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="kb-chip" aria-pressed={layers.size === 0} onClick={() => setLayers(new Set())}>
          All
        </button>
        {(["company", "confluence", "brand"] as ChunkLayer[]).map((l) => (
          <button key={l} className="kb-chip" aria-pressed={layers.has(l)} onClick={() => toggleLayer(l)}>
            {LAYER_LABEL[l]} {stats.byLayer[l]}
          </button>
        ))}
        <select className="kb-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-retrieved">Most retrieved</option>
        </select>
        <KbPresets current={{ search, layers: [...layers], sort, axes: axisSel }} onApply={applyPreset} />
      </div>

      <p className="kb-resultcount" style={{ margin: "var(--space-3) 0" }}>
        {filtered.length} of {chunks.length} chunks
      </p>

      {pageItems.length === 0 ? (
        <div className="kb-empty">No chunks for these filters.</div>
      ) : (
        <div className="kb-cards">
          {pageItems.map((c) => (
            <article key={c.uid} className="kb-card">
              <div className="kb-card-top">
                <div className="kb-card-tags">
                  <span className="kb-tag kb-tag--layer">{LAYER_LABEL[c.layer]}</span>
                  <span className="kb-tag">{c.sourceType}</span>
                  {c.priority === 1 && <span className="kb-tag kb-tag--priority">Priority 1</span>}
                  {[
                    ...(c.tags.topics ?? []),
                    ...(c.tags.airlines ?? []),
                    ...(c.tags.departments ?? []),
                    ...(c.tags.brands ?? []),
                    ...(c.tags.providers ?? []),
                  ].map((t, i) => (
                    <span key={`${t}-${i}`} className="kb-tag">
                      {t}
                    </span>
                  ))}
                </div>
                {c.editable ? (
                  <button className="kb-chip" onClick={() => setEditing(c)}>
                    <Pencil size={13} /> Edit
                  </button>
                ) : (
                  <span
                    className="kb-readonly"
                    title="Content comes from the source and is regenerated on the next embedding. Corrections via the AI chat → Reviews."
                  >
                    <Lock size={11} aria-hidden="true" /> Read-only
                  </span>
                )}
              </div>
              <div className="kb-card-title">{c.title}</div>
              <ChunkBody chunk={c} />
              <div className="kb-card-foot">
                <span>
                  <Database size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  {LAYER_LABEL[c.layer]}
                </span>
                <span className="kb-foot-dot">Retrieved ×{c.retrievedCount}</span>
                <span className="kb-foot-dot">
                  {new Date(c.createdAt).toLocaleDateString("de-DE")}
                </span>
                {!c.hasEmbedding && (
                  <span className="kb-foot-dot kb-noembed">
                    <AlertCircle size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                    no embedding
                  </span>
                )}
                <button className="kb-expand" style={{ marginLeft: "auto" }} onClick={() => setAuditing(c)}>
                  <History size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                  History
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="kb-pager">
          <button className="kb-pager-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Newer
          </button>
          <span className="kb-pager-label">Page {page + 1} / {pageCount}</span>
          <button className="kb-pager-btn" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Older →
          </button>
        </div>
      )}

      {editing && <EditChunkModal chunk={editing} onClose={() => setEditing(null)} />}
      {auditing && <AuditDrawer chunk={auditing} onClose={() => setAuditing(null)} />}
      {creating && <CreateContextModal onClose={() => setCreating(false)} />}
    </div>
  );
}

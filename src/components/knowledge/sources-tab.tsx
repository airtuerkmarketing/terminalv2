"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, AlertCircle, Pencil, History } from "lucide-react";
import { inferContentShape } from "@/lib/knowledge/shape";
import { EditChunkModal } from "./edit-chunk-modal";
import { AuditDrawer } from "./audit-drawer";
import type { ChunkLayer, KnowledgeChunk, KnowledgeStats } from "@/lib/knowledge/types";

const PAGE_SIZE = 25;

const LAYER_LABEL: Record<ChunkLayer, string> = {
  company: "Identität",
  confluence: "Confluence",
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
          {expanded ? "Weniger" : "Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

export function SourcesTab({
  chunks,
  stats,
  initial,
}: {
  chunks: KnowledgeChunk[];
  stats: KnowledgeStats;
  initial: { search: string; layers: ChunkLayer[]; sort: string };
}) {
  const [search, setSearch] = useState(initial.search);
  const [layers, setLayers] = useState<Set<ChunkLayer>>(new Set(initial.layers));
  const [sort, setSort] = useState(initial.sort || "newest");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<KnowledgeChunk | null>(null);
  const [auditing, setAuditing] = useState<KnowledgeChunk | null>(null);

  // Reflect filter state to the URL (shareable) without re-fetching.
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      p.set("tab", "sources");
      search ? p.set("search", search) : p.delete("search");
      layers.size ? p.set("layer", [...layers].join(",")) : p.delete("layer");
      sort !== "newest" ? p.set("sort", sort) : p.delete("sort");
      window.history.replaceState(null, "", `?${p.toString()}`);
    }, 250);
    return () => clearTimeout(t);
  }, [search, layers, sort]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = chunks.filter((c) => (layers.size === 0 || layers.has(c.layer)));
    if (q) out = out.filter((c) => c.content.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
    out = [...out].sort((a, b) => {
      if (sort === "most-retrieved") return b.retrievedCount - a.retrievedCount;
      const cmp = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      return sort === "oldest" ? cmp : -cmp;
    });
    return out;
  }, [chunks, search, layers, sort]);

  useEffect(() => setPage(0), [search, layers, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleLayer(l: ChunkLayer) {
    setLayers((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });
  }

  return (
    <div>
      <div className="kb-toolbar">
        <input
          className="kb-search"
          placeholder="Chunks durchsuchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="kb-chip" aria-pressed={layers.size === 0} onClick={() => setLayers(new Set())}>
          Alle
        </button>
        {(["company", "confluence", "brand"] as ChunkLayer[]).map((l) => (
          <button key={l} className="kb-chip" aria-pressed={layers.has(l)} onClick={() => toggleLayer(l)}>
            {LAYER_LABEL[l]} {stats.byLayer[l]}
          </button>
        ))}
        <select className="kb-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortierung">
          <option value="newest">Neueste</option>
          <option value="oldest">Älteste</option>
          <option value="most-retrieved">Meist abgerufen</option>
        </select>
      </div>

      <p className="kb-resultcount" style={{ margin: "var(--space-3) 0" }}>
        {filtered.length} von {chunks.length} Chunks
      </p>

      {pageItems.length === 0 ? (
        <div className="kb-empty">Keine Chunks für diese Filter.</div>
      ) : (
        <div className="kb-cards">
          {pageItems.map((c) => (
            <article key={c.uid} className="kb-card">
              <div className="kb-card-top">
                <div className="kb-card-tags">
                  <span className="kb-tag kb-tag--layer">{LAYER_LABEL[c.layer]}</span>
                  <span className="kb-tag">{c.sourceType}</span>
                  {c.priority === 1 && <span className="kb-tag kb-tag--priority">Priorität 1</span>}
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
                {c.editable && (
                  <button className="kb-chip" onClick={() => setEditing(c)}>
                    <Pencil size={13} /> Bearbeiten
                  </button>
                )}
              </div>
              <div className="kb-card-title">{c.title}</div>
              <ChunkBody chunk={c} />
              <div className="kb-card-foot">
                <span>
                  <Database size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  {LAYER_LABEL[c.layer]}
                </span>
                <span className="kb-foot-dot">Abgerufen ×{c.retrievedCount}</span>
                <span className="kb-foot-dot">
                  {new Date(c.createdAt).toLocaleDateString("de-DE")}
                </span>
                {!c.hasEmbedding && (
                  <span className="kb-foot-dot kb-noembed">
                    <AlertCircle size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                    kein Embedding
                  </span>
                )}
                <button className="kb-expand" style={{ marginLeft: "auto" }} onClick={() => setAuditing(c)}>
                  <History size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                  Verlauf
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="kb-pager">
          <button className="kb-pager-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Neuer
          </button>
          <span className="kb-pager-label">Seite {page + 1} / {pageCount}</span>
          <button className="kb-pager-btn" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Älter →
          </button>
        </div>
      )}

      {editing && <EditChunkModal chunk={editing} onClose={() => setEditing(null)} />}
      {auditing && <AuditDrawer chunk={auditing} onClose={() => setAuditing(null)} />}
    </div>
  );
}

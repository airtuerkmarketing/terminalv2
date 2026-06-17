"use client";

import { useMemo, useState } from "react";
import "@/styles/document-library.css";
// Type-only import: erased at compile time, so server-only pages.ts is NOT pulled
// into this client bundle.
import type { DocCardDTO, DocumentLibraryData } from "@/lib/pages";

// Coarse department filter chips (from documents.department). "Alle" is prepended.
const DEPARTMENTS = [
  { key: "agenturverwaltung", label: "Agenturverwaltung" },
  { key: "hr", label: "HR" },
  { key: "sales", label: "Sales" },
  { key: "business-development", label: "Business Dev" },
] as const;

// Fine grouping → human-readable section headings (documents.category).
const CATEGORY_LABELS: Record<string, string> = {
  "framework-agreement": "Framework Agreement",
  "partner-agreement": "Partner Agreement",
  nda: "Non-Disclosure Agreement",
  "api-doc": "API Documentation",
  "sepa-mandate": "SEPA Mandate",
  "bank-info": "Bank Information",
  "hr-form": "Travel Expense Form",
};
const CATEGORY_ORDER = [
  "framework-agreement",
  "partner-agreement",
  "nda",
  "api-doc",
  "sepa-mandate",
  "bank-info",
  "hr-form",
];

function catLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c;
}
function catRank(c: string): number {
  const i = CATEGORY_ORDER.indexOf(c);
  return i === -1 ? 99 : i;
}

/**
 * Document Library (hardcoded route /documents-library). Cards are already
 * pair-collapsed server-side (one card per logical document, with its PDF/Word/…
 * formats). The department chip filter is client-side (same pattern as the Asset
 * Library category filter). The Sales chip exists but has 0 docs → empty state.
 */
export function DocumentLibrary({ title, data }: { title: string; data: DocumentLibraryData }) {
  const { cards, sampleCoverUrl } = data;
  const [active, setActive] = useState<string>("all");

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.department, (counts.get(c.department) ?? 0) + 1);
    return [
      { key: "all", label: "Alle", count: cards.length },
      // Hide zero-count department chips generically (e.g. Sales today has 0
      // docs). A department only shows once it has at least one document.
      ...DEPARTMENTS.map((d) => ({ key: d.key, label: d.label, count: counts.get(d.key) ?? 0 }))
        .filter((d) => d.count > 0),
    ];
  }, [cards]);

  const filtered = useMemo(
    () => (active === "all" ? cards : cards.filter((c) => c.department === active)),
    [cards, active]
  );

  const sections = useMemo(() => {
    const byCat = new Map<string, DocCardDTO[]>();
    for (const c of filtered) {
      const arr = byCat.get(c.category) ?? [];
      arr.push(c);
      byCat.set(c.category, arr);
    }
    return [...byCat.entries()]
      .map(([category, items]) => ({ category, label: catLabel(category), items }))
      .sort((a, b) => catRank(a.category) - catRank(b.category));
  }, [filtered]);

  return (
    <article className="document-library">
      <header className="page-hero">
        <div className="eyebrow">Resources</div>
        <h1>{title}</h1>
        <p className="lead">
          Contracts, mandates and forms across departments — each as a downloadable PDF and,
          where available, an editable Word version.
        </p>
      </header>

      <div className="doc-filters" role="tablist" aria-label="Departments">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={active === c.key}
            className={`doc-chip${active === c.key ? " active" : ""}`}
            onClick={() => setActive(c.key)}
          >
            {c.label}
            <span className="doc-chip-count">{c.count}</span>
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <div className="doc-empty">
          {active === "sales" ? (
            <>
              <strong>No Sales documents yet.</strong>
              <span>KIM contracts will appear here once they’re added.</span>
            </>
          ) : (
            <span>No documents in this department.</span>
          )}
        </div>
      ) : (
        sections.map((s) => (
          <section key={s.category} className="doc-section">
            <div className="doc-section-head">
              <h2>{s.label}</h2>
              <span className="doc-section-count">{s.items.length}</span>
              <div className="doc-line" />
            </div>
            <div className="doc-card-grid">
              {s.items.map((card) => (
                <DocCard key={card.pairId} card={card} fallbackCover={sampleCoverUrl} />
              ))}
            </div>
          </section>
        ))
      )}
    </article>
  );
}

function DocCard({ card, fallbackCover }: { card: DocCardDTO; fallbackCover: string | null }) {
  // Per-document preview cover overrides the shared fallback (preview_asset_id is
  // NULL for every document today, so every card uses the fallback for now).
  const cover = card.coverUrl ?? fallbackCover;
  const kinds = [...new Set(card.formats.map((f) => f.kind))];

  return (
    <div className="doc-card">
      <div className="doc-cover">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage cover URL */
          <img className="doc-cover-img" src={cover} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="doc-cover-fallback" aria-hidden="true" />
        )}
        <div className="doc-badges">
          {kinds.map((k) => (
            <span key={k} className="doc-badge">
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="doc-meta">
        <div className="doc-title" title={card.title}>
          <span className="doc-title-text">{card.title}</span>
          {card.language ? <span className="doc-lang">{card.language.toUpperCase()}</span> : null}
        </div>
        <div className="doc-downloads">
          {card.formats.map((f) => (
            <a
              key={f.kind}
              className="doc-download"
              href={f.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${card.title} as ${f.kind}`}
            >
              <span className="doc-dl-badge">{f.kind}</span>
              <span className="doc-dl-label">Download {f.kind}</span>
              <DownloadSvg />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function DownloadSvg() {
  return (
    <svg className="doc-dl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

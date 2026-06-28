"use client";

import { useMemo, useState } from "react";
import "@/styles/asset-library.css";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
// Type-only import: erased at compile time, so it does NOT pull the server-only
// pages.ts module into this client bundle.
import type { AssetDTO } from "@/lib/pages";

const CATEGORY_ORDER = ["Logos", "Icons", "Backgrounds", "Photography", "Other"];

function ext(mime: string): string {
  if (mime === "image/svg+xml") return "SVG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg") return "JPG";
  if (mime === "image/webp") return "WEBP";
  return (mime.split("/")[1] ?? "FILE").toUpperCase();
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function orderCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

/**
 * Asset Library (hardcoded route /asset-library). Server-fetched image assets
 * are passed in; search + category filtering are client-side. 708 cards render
 * with native lazy-loading (loading="lazy") so off-screen thumbnails defer —
 * no manual pagination needed.
 */
export function AssetLibrary({ title, assets }: { title: string; assets: AssetDTO[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("All");
  // Default "card" matches SSR; ViewToggle lifts the persisted choice after mount.
  const [view, setView] = useState<ViewMode>("card");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return [
      { key: "All", count: assets.length },
      ...orderCategories([...counts.keys()]).map((c) => ({ key: c, count: counts.get(c) ?? 0 })),
    ];
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (active === "All" || a.category === active) &&
        (q === "" || a.name.toLowerCase().includes(q))
    );
  }, [assets, active, query]);

  const groups = useMemo(() => {
    const byCat = new Map<string, AssetDTO[]>();
    for (const a of filtered) {
      const arr = byCat.get(a.category) ?? [];
      arr.push(a);
      byCat.set(a.category, arr);
    }
    return orderCategories([...byCat.keys()]).map((c) => ({ category: c, items: byCat.get(c) ?? [] }));
  }, [filtered]);

  return (
    <article className="asset-library">
      <header className="al-head">
        <div className="al-head-title">
          <h1>{title}</h1>
        </div>
      </header>

      <div className="al-toolbar">
        <div className="al-search">
          <SearchSvg />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${assets.length} assets...`}
            aria-label="Search assets"
          />
        </div>
        <ViewToggle value={view} onChange={setView} storageKey="terminalv2-assetlib-view" />
      </div>

      <div className="al-filters" role="tablist" aria-label="Asset categories">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={active === c.key}
            className={`al-chip${active === c.key ? " active" : ""}`}
            onClick={() => setActive(c.key)}
          >
            {c.key}
            <span className="al-chip-count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="al-count">
        {filtered.length} {filtered.length === 1 ? "asset" : "assets"}
      </div>

      {groups.length === 0 ? (
        <div className="al-empty">No assets match your search.</div>
      ) : (
        groups.map((g) => (
          <section key={g.category} className="al-section">
            <div className="al-section-head">
              <h2>{g.category}</h2>
              <span className="al-section-count">{g.items.length}</span>
              <div className="al-line" />
            </div>
            <div className="al-grid" data-view={view}>
              {g.items.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          </section>
        ))
      )}
    </article>
  );
}

function AssetCard({ asset }: { asset: AssetDTO }) {
  // Free-standing cell, 1:1 with the Document Library card view (.dl-cell): a
  // shadowed object on top, then the name, then the meta — no surrounding box.
  // Logos + icons sit contained on a soft backdrop so transparent art reads;
  // photography/backgrounds fill the thumb (cover), like the Documents image
  // thumbnails. Assets are read-only — the name is a plain label (no rename).
  const contain = asset.category === "Logos" || asset.category === "Icons";
  return (
    <div className="al-cell">
      <a
        className="al-cell__hit"
        href={asset.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${asset.name}`}
      >
        <span className="al-cell__visual">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Supabase Storage asset URL */}
          <img
            className={`al-cell__thumb${contain ? " is-contain" : ""}`}
            src={asset.url}
            alt={asset.name}
            loading="lazy"
            decoding="async"
          />
        </span>
      </a>
      {/* Hover-only download — mirrors .dl-cell__dl. stopPropagation keeps it from
          opening the asset. */}
      <a
        className="al-cell__dl"
        href={asset.url}
        target="_blank"
        rel="noopener noreferrer"
        download
        onClick={(e) => e.stopPropagation()}
        aria-label={`Download ${asset.name}`}
        title="Download"
      >
        <DownloadSvg />
      </a>
      <div className="al-cell__name" title={asset.name}>
        {asset.name}
      </div>
      <div className="al-cell__sub">
        {ext(asset.mime)} · {formatSize(asset.size)}
      </div>
    </div>
  );
}

function SearchSvg() {
  // Matches the lucide <Search size={16}> used in the Documents toolbar.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function DownloadSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

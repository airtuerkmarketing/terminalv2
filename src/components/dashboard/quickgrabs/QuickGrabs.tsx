"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Package, Search, Sparkles } from "lucide-react";
import "@/styles/dashboard-quickgrabs.css";
import { NavIcon } from "@/components/shell/icons";
import { QUICK_GRABS, BRAND_TABS, type QuickGrabCard } from "./quickgrabs-data";

const AUTO_MS = 5000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function CardIcon({ kind }: { kind: QuickGrabCard["kind"] }) {
  return kind === "aktion" ? <Sparkles aria-hidden /> : <Package aria-hidden />;
}

export function QuickGrabs() {
  const count = QUICK_GRABS.length;
  const [active, setActive] = useState(0);
  const hovering = useRef(false);

  const go = useCallback((i: number) => setActive(((i % count) + count) % count), [count]);
  const next = useCallback(() => go(active + 1), [go, active]);
  const prev = useCallback(() => go(active - 1), [go, active]);

  // Auto-advance every 5s, paused on hover. Skipped entirely under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (!hovering.current) setActive((a) => (a + 1) % count);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [count]);

  const [tab, setTab] = useState<"all" | string>("all");
  const rows = tab === "all" ? BRAND_TABS : BRAND_TABS.filter((b) => b.slug === tab);

  return (
    <section className="qg-section" aria-label="Quick Grabs">
      <header className="qg-head">
        <div className="qg-head-text">
          <h2 className="qg-title">Quick Grabs</h2>
          <p className="qg-sub">Deine wichtigsten Assets — direkt griffbereit</p>
        </div>
        {/* Visual-only search affordance (no state yet). */}
        <div className="qg-search" aria-hidden="true">
          <Search className="qg-search-icon" aria-hidden />
          <span className="qg-search-ph">Apps suchen</span>
        </div>
      </header>

      <div
        className="qg-carousel"
        onMouseEnter={() => { hovering.current = true; }}
        onMouseLeave={() => { hovering.current = false; }}
      >
        <div className="qg-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {QUICK_GRABS.map((c) => (
            <article className="car-card" key={c.id}>
              <div
                className="car-photo"
                style={{ background: `linear-gradient(135deg, ${c.accentHex}, color-mix(in srgb, ${c.accentHex} 60%, #000))` }}
              />
              {c.imageUrl ? (
                <div className="car-img-zone">
                  {/* eslint-disable-next-line @next/next/no-img-element -- optional card art */}
                  <img src={c.imageUrl} alt="" aria-hidden="true" />
                </div>
              ) : null}
              <div className="car-content">
                <span className="car-coin"><CardIcon kind={c.kind} /></span>
                <span className="car-tag">{c.kind}</span>
                <h3 className="car-title">{c.title}</h3>
                <p className="car-sub">{c.sub}</p>
                <a className="car-cta" href={c.href}>{c.cta}</a>
              </div>
            </article>
          ))}
        </div>

        <div className="qg-dots">
          {QUICK_GRABS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`qg-dot${i === active ? " is-active" : ""}`}
              aria-label={`Karte ${i + 1}`}
              aria-current={i === active}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <button type="button" className="qg-arrow qg-arrow-prev" aria-label="Vorherige" onClick={prev}>
          <ChevronLeft aria-hidden />
        </button>
        <button type="button" className="qg-arrow qg-arrow-next" aria-label="Nächste" onClick={next}>
          <ChevronRight aria-hidden />
        </button>
      </div>

      {/* ── Brand tab list ── */}
      <div className="qg-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={`qg-tab${tab === "all" ? " is-active" : ""}`}
          onClick={() => setTab("all")}
        >
          Alle Marken
        </button>
        {BRAND_TABS.map((b) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={tab === b.slug}
            className={`qg-tab${tab === b.slug ? " is-active" : ""}`}
            onClick={() => setTab(b.slug)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <ul className="qg-brand-list">
        {rows.map((b) => (
          <li key={b.slug}>
            <a className="qg-brand-row" href={b.href}>
              <span className="qg-brand-coin"><NavIcon name={b.slug} /></span>
              <span className="qg-brand-meta">
                <span className="qg-brand-name">{b.label}</span>
                <span className="qg-brand-desc">{b.description}</span>
              </span>
              <ChevronRight className="qg-brand-chevron" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

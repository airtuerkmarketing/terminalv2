"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "@/styles/dashboard-quickgrabs.css";
import { NavIcon } from "@/components/shell/icons";
import { QUICK_GRABS, BRAND_TABS, type QuickGrabCard } from "./quickgrabs-data";

const AUTO_MS = 5000;

// Fixed tab set + order. Only "all" has content for now (the brand list).
const QG_TABS = [
  { id: "all", label: "All brands" },
  { id: "featured", label: "Featured" },
  { id: "tools", label: "Tools" },
  { id: "templates", label: "Templates" },
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Badge glyph per card. atbeds reuses the real brand mark; deck the presentation
 *  glyph; signature a lucide pen-line (real 1.18.0 geometry). */
function QGBadgeIcon({ icon }: { icon: QuickGrabCard["icon"] }) {
  if (icon === "atbeds") return <NavIcon name="atbeds" />;
  if (icon === "deck") return <NavIcon name="presentation-hub" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 21h8" />
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </svg>
  );
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

  const [tab, setTab] = useState("all");
  // Tab-Inhalte für Vorgestellt/Tools/Vorlagen folgen später — vorerst zeigt nur
  // "Alle Marken" die Markenliste, die anderen Tabs eine leere Platzhalter-Liste.
  const rows = tab === "all" ? BRAND_TABS : [];

  return (
    <section className="qg-section" aria-label="Quick Grabs">
      <header className="qg-head">
        <div className="qg-head-text">
          <h2 className="qg-title">Quick Grabs</h2>
          <p className="qg-sub">Your most important assets — right at your fingertips</p>
        </div>
        {/* Right side intentionally empty (whitespace) — the dead "Search apps"
            affordance was removed. */}
      </header>

      <div
        className="qg-carousel"
        onMouseEnter={() => { hovering.current = true; }}
        onMouseLeave={() => { hovering.current = false; }}
      >
        <div className="qg-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {QUICK_GRABS.map((c) => (
            <article className="car-card" key={c.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed card art */}
              <img className="car-bg" src={c.bgUrl} alt="" aria-hidden="true" />
              <span className="car-scrim" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element -- right-side composition */}
              <img className="car-art" src={c.artUrl} alt="" aria-hidden="true" />
              <div className="car-content">
                <span className="car-badge"><QGBadgeIcon icon={c.icon} /></span>
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
              aria-label={`Card ${i + 1}`}
              aria-current={i === active}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <button type="button" className="qg-arrow qg-arrow-prev" aria-label="Previous" onClick={prev}>
          <ChevronLeft aria-hidden />
        </button>
        <button type="button" className="qg-arrow qg-arrow-next" aria-label="Next" onClick={next}>
          <ChevronRight aria-hidden />
        </button>
      </div>

      {/* ── Tabs (content for Vorgestellt/Tools/Vorlagen follows later) ── */}
      <div className="qg-tabs" role="tablist">
        {QG_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`qg-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
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
        {rows.length === 0 ? (
          <li className="qg-brand-empty">Content coming soon.</li>
        ) : null}
      </ul>
    </section>
  );
}

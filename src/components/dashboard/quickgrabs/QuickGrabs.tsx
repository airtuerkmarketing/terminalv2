"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  Files,
  GalleryVerticalEnd,
  IdCard,
  Image as ImageIcon,
  Palette,
  PenLine,
  Presentation,
} from "lucide-react";
import "@/styles/dashboard-quickgrabs.css";
import { NavIcon } from "@/components/shell/icons";
import {
  QUICK_GRABS,
  BRAND_TABS,
  FEATURED_ROWS,
  TOOLS_ROWS,
  TEMPLATES_ROWS,
  type QuickGrabCard,
  type QGRow,
} from "./quickgrabs-data";

const ROWS_BY_TAB: Record<string, QGRow[]> = {
  featured: FEATURED_ROWS,
  tools: TOOLS_ROWS,
  templates: TEMPLATES_ROWS,
};

const AUTO_MS = 5000;
// Movement (px) past which a pointer gesture counts as a DRAG, not a click — used
// both to start following the pointer meaningfully and to suppress the stretched
// link on release. Slide-switch threshold is a fraction of the track width.
const DRAG_MOVE_PX = 8;
const SWIPE_RATIO = 0.15;
const SWIPE_MIN_PX = 48;

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

/** Coin glyph for the Featured/Tools/Templates rows. lucide 1.18.0 has no
 *  Linkedin brand icon → IdCard (profile) stands in for "LinkedIn banner". */
function QGRowIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "presentation": return <Presentation aria-hidden />;
    case "image": return <ImageIcon aria-hidden />;
    case "palette": return <Palette aria-hidden />;
    case "files": return <Files aria-hidden />;
    case "pen": return <PenLine aria-hidden />;
    case "file-text": return <FileText aria-hidden />;
    case "linkedin": return <IdCard aria-hidden />;
    case "gallery": return <GalleryVerticalEnd aria-hidden />;
    default: return <Files aria-hidden />;
  }
}

export function QuickGrabs() {
  const count = QUICK_GRABS.length;
  const [active, setActive] = useState(0);
  const hovering = useRef(false);

  // Drag / swipe. dragOffsetPx is the live finger/mouse offset (the track follows
  // it with its transition switched off); dragging toggles the cursor + that
  // transition. drag holds gesture state that must update synchronously (the
  // pointermove/up handlers gate on pointerId, not on the async state). `moved`
  // records whether the DRAG_MOVE_PX threshold was crossed → the stretched-link
  // click is suppressed on release so a swipe never navigates.
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startX: 0, pointerId: -1, moved: false, dx: 0 });

  const go = useCallback((i: number) => setActive(((i % count) + count) % count), [count]);
  const next = useCallback(() => go(active + 1), [go, active]);

  // Auto-advance every 5s, paused on hover and while dragging (no interval is
  // created during a drag; it restarts afterwards). Skipped under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion() || dragging) return;
    const id = window.setInterval(() => {
      if (!hovering.current) setActive((a) => (a + 1) % count);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, dragging]);

  // Pointer capture is taken LAZILY — only once the move threshold is crossed —
  // not on pointerdown. Capturing on pointerdown makes Chromium fire the eventual
  // click on the capture target instead of the link, so a plain tap/click would
  // never navigate. Recording on down + capturing on first real move keeps clicks
  // working and still lets a drag follow the pointer outside the track.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return; // primary button only
    drag.current = { startX: e.clientX, pointerId: e.pointerId, moved: false, dx: 0 };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current.pointerId === -1) return;
    let dx = e.clientX - drag.current.startX;
    if (!drag.current.moved) {
      if (Math.abs(dx) <= DRAG_MOVE_PX) return; // still within click tolerance
      drag.current.moved = true; // promote to a drag: capture + enter drag mode
      e.currentTarget.setPointerCapture(drag.current.pointerId);
      setDragging(true);
    }
    // No edge resistance — the carousel loops, so every direction has a neighbour.
    drag.current.dx = dx;
    setDragOffsetPx(dx);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current.pointerId === -1) return;
    if (drag.current.moved) {
      const el = trackRef.current;
      const width = el?.offsetWidth ?? 1;
      const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_RATIO);
      const dx = drag.current.dx;
      // Loop on drag like the arrow/dots: go() wraps (go(-1)→last, go(count)→0),
      // so no edge clamping. dir 0 = below threshold → snap back to current.
      const dir = dx <= -threshold ? 1 : dx >= threshold ? -1 : 0;
      if (dir !== 0) {
        const target = ((active + dir) % count + count) % count;
        // A wrap (first↔last) jumps more than one slide. With the normal 420ms
        // transition the strip would glide the "wrong" way across the middle
        // slide(s); snap it instantly instead (forced reflow commits the jump
        // before React re-enables the transition) for a clean cut.
        if (el && Math.abs(target - active) > 1) {
          el.style.transition = "none";
          el.style.transform = `translateX(-${target * 100}%)`;
          void el.offsetWidth;
        }
        go(active + dir);
      }
      if (e.currentTarget.hasPointerCapture(drag.current.pointerId)) {
        e.currentTarget.releasePointerCapture(drag.current.pointerId);
      }
      setDragOffsetPx(0); // snap (transition re-enabled now that dragging is false)
      setDragging(false);
    }
    drag.current.pointerId = -1; // a no-move release stays a click (moved=false → link fires)
  }

  const [tab, setTab] = useState("all");
  // "all" → brand list (NavIcon); the other tabs → curated QGRows (QGRowIcon).
  const qgRows = tab === "all" ? [] : ROWS_BY_TAB[tab] ?? [];
  const isEmpty = tab === "all" ? BRAND_TABS.length === 0 : qgRows.length === 0;

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
        className={`qg-carousel${dragging ? " is-dragging" : ""}`}
        onMouseEnter={() => { hovering.current = true; }}
        onMouseLeave={() => { hovering.current = false; }}
      >
        <div
          ref={trackRef}
          className="qg-track"
          style={{
            transform: `translateX(calc(${-active * 100}% + ${dragOffsetPx}px))`,
            transition: dragging ? "none" : undefined,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()} /* kill native img/link drag */
        >
          {QUICK_GRABS.map((c) => (
            <article className="car-card" key={c.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed card art */}
              <img className="car-bg" src={c.bgUrl} alt="" aria-hidden="true" draggable={false} />
              <span className="car-scrim" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element -- right-side composition */}
              <img className="car-art" src={c.artUrl} alt="" aria-hidden="true" draggable={false} />
              <div className="car-content">
                <span className="car-badge"><QGBadgeIcon icon={c.icon} /></span>
                <h3 className="car-title">{c.title}</h3>
                <p className="car-sub">{c.sub}</p>
                {/* Stretched link: .car-cta::after covers the whole card (CSS).
                    Suppress navigation when the gesture was a drag (moved guard);
                    guard a placeholder "#" href so it doesn't scroll-jump. */}
                <a
                  className="car-cta"
                  href={c.href}
                  draggable={false}
                  onClick={(e) => {
                    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; return; }
                    if (c.href === "#") e.preventDefault();
                  }}
                >
                  {c.cta}
                </a>
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

        {/* Next only — stepping back is via the dots. */}
        <button type="button" className="qg-arrow qg-arrow-next" aria-label="Next" onClick={next}>
          <ChevronRight aria-hidden />
        </button>
      </div>

      {/* ── Tabs ── */}
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
        {tab === "all"
          ? BRAND_TABS.map((b) => (
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
            ))
          : qgRows.map((r) => (
              <li key={r.id}>
                <a className="qg-brand-row" href={r.href}>
                  <span className="qg-brand-coin"><QGRowIcon icon={r.icon} /></span>
                  <span className="qg-brand-meta">
                    <span className="qg-brand-name">{r.label}</span>
                    <span className="qg-brand-desc">{r.description}</span>
                  </span>
                  <ChevronRight className="qg-brand-chevron" aria-hidden />
                </a>
              </li>
            ))}
        {isEmpty ? <li className="qg-brand-empty">Content coming soon.</li> : null}
      </ul>
    </section>
  );
}

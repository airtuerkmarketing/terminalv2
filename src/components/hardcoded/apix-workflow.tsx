"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ComponentType } from "react";
import {
  Wifi, FileText, Sparkles, CreditCard, CodeXml, CircleCheck,
  RotateCcw, Maximize, Minimize, ChevronLeft, ChevronRight, X,
  Tags, Route, Luggage, Receipt, Combine, Database, CalendarClock,
  Accessibility, ArrowLeftRight, Briefcase, UserRound,
} from "lucide-react";
import "@/styles/apix-workflow.css";

/**
 * APIX Workflow — interactive diagram (Phase 4, Task 10a). First APIX tool.
 *
 * Ported from the recovered standalone embed (the faithful original). The port
 * locks the self-owned-stack pattern the later APIX tools reuse:
 *   • LIBRARIES bundled, never CDN — the only lib the Workflow needs is lucide
 *     for icons; the app already bundles `lucide-react`, used here as React
 *     components (the original's jsDelivr `lucide` + `createIcons()` is gone).
 *   • IMAGES on Supabase — the 6 cdn.prod.website-files.com images were migrated
 *     to the `images` bucket under apix/workflow/ and are referenced by their
 *     Supabase public URL (built from NEXT_PUBLIC_SUPABASE_URL).
 *   • FONTS app-native — the original's Google Fonts <link>s are dropped; the
 *     tool inherits var(--font) via apix-workflow.css.
 *
 * Structure: static `.ax-*` markup as JSX (boxes carry SSR `left/top` so React
 * never clobbers a dragged position on re-render — the inline values are
 * constant, so the reconciler skips them and the engine's mutations survive).
 * The drag / SVG-line / scale / fullscreen engine is imperative, scoped to refs
 * inside one useEffect with full teardown — no window/DOM at module scope, so
 * the page SSRs/builds cleanly. The modal is idiomatic React state (`modalId`).
 */

type IconC = ComponentType<{ className?: string }>;

// Supabase public-URL base for the migrated diagram images (apix/workflow/).
const SB_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/apix/workflow/`;
const IMG: Record<string, string> = {
  charter: SB_BASE + "charter.png",
  fullcharter: SB_BASE + "full-charter.png",
  scheduled: SB_BASE + "scheduled-flights.png",
  ndc: SB_BASE + "ndc-direct.png",
  leftover: SB_BASE + "left-over-seats.png",
};
const CUSTOMERS_BG = SB_BASE + "customers-bg.jpg";

// Lucide icon component per node id (verbatim id→name map from the original).
const ICONS: Record<string, IconC> = {
  content: FileText, payment: CreditCard, features: Sparkles,
  volumedeals: Tags, conditions: Route, luggage: Luggage,
  refund: RotateCcw, invoicing: Receipt,
  multiairline: Combine, checkin: CircleCheck, cache: Database,
  schedule: CalendarClock, ssr: Accessibility, oneway: ArrowLeftRight,
  b2b: Briefcase, b2c: UserRound,
};

// Per-module color themes — content blue, payment green, features orange (CONTENT).
type Theme = { c: string; soft: string; g1: string; g2: string };
const THEME: Record<string, Theme> = {
  content: { c: "#0A82DF", soft: "#EFF6FE", g1: "#EFF6FE", g2: "#CFE4F9" },
  payment: { c: "#16a34a", soft: "#ECFDF3", g1: "#ECFDF3", g2: "#C3EFD3" },
  features: { c: "#EA580C", soft: "#FFF3EC", g1: "#FFF4ED", g2: "#FBD7BE" },
};

interface NodeData { b: string; t: string; d: string; img?: string; items?: string[]; parent?: string }

// Node content + copy — ported VERBATIM from the original.
const DATA: Record<string, NodeData> = {
  charter: { b: "Source · Inventory", t: "Charter Flights", img: "charter", d: "<p>Exclusive seat blocks contracted directly with charter operators. airtuerk negotiates dedicated allocations on charter aircraft, giving partners reliable access to inventory not available through traditional channels.</p><p>Especially valuable for seasonal routes and tour-operator-friendly destinations where guaranteed capacity beats market availability.</p>" },
  fullcharter: { b: "Source · Inventory", t: "Full-Charter", img: "fullcharter", d: "<p>Complete aircraft chartered by airtuerk for specific routes or programs. Used when partners need guaranteed capacity at scale — high-volume holiday routes, group movements, or seasonal peaks where every seat counts.</p><p>APIX exposes these capacity blocks alongside scheduled inventory, so partners can sell from a single search.</p>" },
  scheduled: { b: "Source · Inventory", t: "Scheduled Flights", img: "scheduled", d: "<p>IATA-published commercial routes from scheduled airlines worldwide. Connected via direct GDS feeds and cached for sub-second response times.</p><p>The standard backbone for any travel platform — every major destination, every major carrier, in real time.</p>" },
  ndc: { b: "Source · Inventory", t: "NDC + Direct Connections", img: "ndc", d: "<p>Direct connections to airline NDC (New Distribution Capability) feeds and direct API integrations. Goes beyond traditional GDS to deliver richer content, branded fares, ancillaries, and dynamic pricing.</p><p>Currently includes Lufthansa, SWISS and other NDC-enabled carriers, with new connections added continuously.</p>" },
  leftover: { b: "Source · Inventory", t: "Left Over Seats", img: "leftover", d: "<p>Last-minute unsold inventory aggregated from multiple sources. Often available at discounted rates and ideal for flash-deal platforms, last-minute booking engines, and opportunistic resellers.</p><p>APIX surfaces these seats automatically as they become available — no separate integration required.</p>" },
  streaming: { b: "Infrastructure", t: "Data Streaming", d: "<p>The real-time aggregation layer that brings every source into a unified data stream. Continuous price updates, availability changes, and schedule modifications flow through here before they reach the gateway.</p><p>This is what makes APIX feel instant — no batch jobs, no stale data, no waiting for nightly syncs.</p>" },
  content: { b: "Module · Content", t: "Content Module", d: "<p>Pricing rules, route-specific conditions, and baggage configuration — all the commercial logic that turns raw inventory into a sellable product.</p><p>APIX lets partners configure custom content rules per market or even per individual customer.</p>", items: ["volumedeals", "conditions", "luggage"] },
  volumedeals: { b: "Content · Pricing", t: "Volume Deals", d: "<p>Negotiated bulk-rate agreements for partners with significant booking volume. Discounts, override commissions, and custom pricing tiers are applied automatically based on partner ID.</p><p>No manual handling required — partners just integrate once and the right pricing flows through every search and booking.</p>", parent: "content" },
  conditions: { b: "Content · Pricing", t: "Route-specific conditions", d: "<p>Custom rules applied to individual routes. Different fare logic for high-demand corridors, seasonal pricing, or restricted-distribution markets — all configurable without code changes.</p>", parent: "content" },
  luggage: { b: "Content · Ancillaries", t: "Luggage handling", d: "<p>Configurable baggage rules per fare class, route, or partner. APIX surfaces included baggage allowances, paid options, and bag policies consistently across all connected products.</p><p>Eliminates the manual lookup partners would otherwise need against airline-specific baggage tables.</p>", parent: "content" },
  payment: { b: "Module · Payment", t: "Payment Module", d: "<p>Transaction infrastructure built into APIX. Handles the full payment lifecycle — collection, processing, refunds, and partner-specific billing arrangements like invoicing for B2B accounts.</p>", items: ["refund", "invoicing"] },
  refund: { b: "Payment · Automation", t: "Automatic refund feature", d: "<p>Self-service refund flows triggered by cancellation events. Refund eligibility is calculated against fare rules and processed without manual intervention.</p><p>Cuts agency support load significantly — what used to be a back-office task is now an instant API call.</p>", parent: "payment" },
  invoicing: { b: "Payment · Methods", t: "Invoicing + Card payments", d: "<p>Multiple payment paths in one API. Credit card processing for direct B2C bookings, monthly invoicing for B2B partners with credit lines.</p><p>Partners choose what fits their flow without building separate payment integrations.</p>", parent: "payment" },
  features: { b: "Module · Operations", t: "Features Module", d: "<p>Operational tools that make APIX useful day-to-day. Multi-airline ticketing, online check-in, schedule-change automation, special service requests — the heavy lifting that would otherwise require separate integrations is built in.</p>", items: ["multiairline", "checkin", "cache", "schedule", "ssr", "oneway", "b2b", "b2c"] },
  multiairline: { b: "Features · Itinerary", t: "Multiple Airline combination", d: "<p>Combine segments from different carriers into a single itinerary — including mixed scheduled + charter combinations. Pricing and ticketing handled automatically.</p>", parent: "features" },
  checkin: { b: "Features · Service", t: "Online check-in function", d: "<p>Trigger check-in workflows from the partner's interface. APIX brokers the request to the operating airline and returns boarding pass data when available.</p>", parent: "features" },
  cache: { b: "Features · Performance", t: "Cache data query", d: "<p>Fast-lookup endpoint that reads from APIX's cached availability layer. Sub-100ms response for high-frequency queries like search-result enrichment.</p>", parent: "features" },
  schedule: { b: "Features · Automation", t: "Automated schedule change", d: "<p>When carriers update timetables, APIX detects affected bookings, notifies partners, and offers reaccommodation options — all without manual intervention from agents.</p>", parent: "features" },
  ssr: { b: "Features · Service", t: "SSR booking function", d: "<p>Special Service Requests — wheelchair, meal preferences, infant seats — booked through the same API call as the flight itself. No second integration required.</p>", parent: "features" },
  oneway: { b: "Features · Pricing", t: "OneWay + Return content", d: "<p>Smart fare construction that combines one-way and return inventory to create the cheapest possible itinerary, even when traditional return fares would be more expensive.</p>", parent: "features" },
  b2b: { b: "Features · Tools", t: "B2B Management tool", d: "<p>Admin interface for B2B partners to manage their bookings, refunds, billing, and settings — browser-based UI sitting on top of the same APIX endpoints.</p>", parent: "features" },
  b2c: { b: "Features · Tools", t: "B2C Management tool", d: "<p>White-label B2C booking management interface for end-customer self-service. Customers can view bookings, request refunds, and manage extras.</p>", parent: "features" },
  gateway: { b: "Core", t: "airtuerk API Gateway", d: "<p>The single REST endpoint that exposes everything — every source, every module, every feature — through one consistent API.</p><p>Authentication, rate limiting, versioning, and documentation all sit at this layer. <strong>One integration replaces a dozen.</strong></p>" },
  customers: { b: "Endpoint · Partners", t: "Connected partners", d: "<p>APIX is built for travel businesses that need flight inventory programmatically:</p><ul><li><strong>Online Travel Agencies</strong> — power flight search and booking on consumer sites</li><li><strong>Tour Operators</strong> — combine flights with hotel/package inventory</li><li><strong>B2B Portals</strong> — give travel agents access under their own brand</li><li><strong>Booking Engines</strong> — embed flight booking into corporate travel tools</li></ul>" },
};

// Global prev/next order for the modal (content → payment → features items).
const ITEM_ORDER: string[] = ["volumedeals", "conditions", "luggage", "refund", "invoicing", "multiairline", "checkin", "cache", "schedule", "ssr", "oneway", "b2b", "b2c"];

// Connections (gateway links render in the darker "ax-dark" palette).
const CONNS: [string, string][] = [
  ["ndc", "streaming"], ["scheduled", "streaming"], ["fullcharter", "streaming"], ["charter", "streaming"], ["leftover", "streaming"],
  ["streaming", "content"], ["streaming", "payment"], ["streaming", "features"],
  ["content", "gateway"], ["payment", "gateway"], ["features", "gateway"], ["gateway", "customers"],
];

// Box layout — data-x/data-y from the original markup.
const SOURCES = [
  { id: "ndc", x: 40, y: 30, label: "NDC + Direct", img: "ndc" },
  { id: "scheduled", x: 40, y: 195, label: "Scheduled Flights", img: "scheduled" },
  { id: "fullcharter", x: 40, y: 360, label: "Full-Charter", img: "fullcharter" },
  { id: "charter", x: 40, y: 525, label: "Charter", img: "charter" },
  { id: "leftover", x: 40, y: 690, label: "Left Over Seats", img: "leftover" },
];
const MODULES = [
  { id: "content", theme: "content", x: 560, y: 60, title: "Content", items: [
    { id: "volumedeals", label: "Volume Deals" }, { id: "conditions", label: "Special conditions for specific routes" }, { id: "luggage", label: "Luggage" },
  ] },
  { id: "features", theme: "features", x: 980, y: 60, title: "Features", items: [
    { id: "multiairline", label: "Multiple Airline combination" }, { id: "checkin", label: "Online check-in function" }, { id: "cache", label: "Cache data query" },
    { id: "schedule", label: "Automated schedule change" }, { id: "ssr", label: "SSR booking function" }, { id: "oneway", label: "OneWay + Return content" },
    { id: "b2b", label: "B2B Management tool" }, { id: "b2c", label: "B2C Management tool" },
  ] },
  { id: "payment", theme: "payment", x: 760, y: 565, title: "Payment", items: [
    { id: "refund", label: "Automatic refund feature" }, { id: "invoicing", label: "Incl. Invoicing + CC payment" },
  ] },
];

function themeFor(id: string): Theme {
  if (THEME[id]) return THEME[id];
  const d = DATA[id];
  if (d?.parent && THEME[d.parent]) return THEME[d.parent];
  return THEME.content;
}

const pos = (x: number, y: number): CSSProperties => ({ left: `${x}px`, top: `${y}px` });

export function ApixWorkflow({ title }: { title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [modalId, setModalId] = useState<string | null>(null);
  // Mirrors modal open-state for the engine's fullscreen-Escape guard.
  const modalOpenRef = useRef(false);

  // Stable (deps []), so the engine effect can close over it and still run once.
  const open = useCallback((id: string) => { if (DATA[id]) setModalId(id); }, []);

  const navItem = useCallback((dir: number) => {
    setModalId((cur) => {
      if (!cur) return cur;
      const i = ITEM_ORDER.indexOf(cur);
      if (i < 0) return cur; // non-item modals ignore arrows (matches original)
      return ITEM_ORDER[(i + dir + ITEM_ORDER.length) % ITEM_ORDER.length];
    });
  }, []);

  // Mirror open-state for the engine's fullscreen-Escape guard; reset scroll on change.
  useEffect(() => { modalOpenRef.current = modalId !== null; }, [modalId]);
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [modalId]);

  // Modal keyboard: Esc closes, arrows navigate the item carousel.
  useEffect(() => {
    if (modalId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalId(null);
      else if (e.key === "ArrowRight") navItem(1);
      else if (e.key === "ArrowLeft") navItem(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalId, navItem]);

  // ── Imperative diagram engine (drag · ortho SVG lines · scale · fullscreen) ──
  useEffect(() => {
    const root = rootRef.current, stage = stageRef.current, wrap = wrapRef.current, svg = svgRef.current;
    if (!root || !stage || !wrap || !svg) return;

    const CW = 1900, CH = 900, MIN_SCALE = 0.5;
    let scale = 1;
    let dragBox: HTMLElement | null = null, moved = false, startX = 0, startY = 0;
    const dragOff = { x: 0, y: 0 };
    let raf: number | null = null;
    let pend: PointerEvent | null = null;
    const timeouts: number[] = [];
    const cleanups: Array<() => void> = [];

    const boxes: Record<string, HTMLElement> = {};
    const boxEls = Array.from(root.querySelectorAll<HTMLElement>(".ax-box"));
    boxEls.forEach((el) => {
      const id = el.dataset.id; if (!id) return;
      boxes[id] = el;
      el.style.left = `${el.dataset.x ?? "0"}px`;
      el.style.top = `${el.dataset.y ?? "0"}px`;
    });

    function getBoxRect(el: HTMLElement) {
      const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
    }
    type Rect = ReturnType<typeof getBoxRect>;

    function buildOrthoPath(a: Rect, b: Rect): string {
      const goRight = a.cx < b.cx;
      let ax: number, bx: number;
      if (goRight) { ax = a.x + a.w; bx = b.x; } else { ax = a.x; bx = b.x + b.w; }
      const ay = Math.max(a.y + 12, Math.min(a.y + a.h - 12, b.cy));
      const by = Math.max(b.y + 12, Math.min(b.y + b.h - 12, a.cy));
      const R = 14, dx = bx - ax, dy = by - ay;
      if (Math.abs(dy) < 3) return `M${ax} ${ay} L${bx} ${by}`;
      if (Math.abs(dx) < 10) { const midX = (ax + bx) / 2; return `M${ax} ${ay} L${midX} ${ay} L${midX} ${by} L${bx} ${by}`; }
      let mx = ax + dx * 0.5; const minClear = R + 6;
      if (goRight) { if (mx - ax < minClear) mx = ax + minClear; if (bx - mx < minClear) mx = bx - minClear; }
      else { if (ax - mx < minClear) mx = ax - minClear; if (mx - bx < minClear) mx = bx + minClear; }
      const rx = Math.min(R, Math.abs(mx - ax) - 2, Math.abs(bx - mx) - 2);
      const ry = Math.min(R, Math.abs(dy) / 2 - 1);
      const r = Math.max(2, Math.min(rx, ry));
      const sx = goRight ? 1 : -1, sy = dy > 0 ? 1 : -1;
      let p = `M${ax} ${ay}`; p += ` L${mx - r * sx} ${ay}`;
      const s1 = (sx === 1 && sy === 1) || (sx === -1 && sy === -1) ? 1 : 0;
      p += ` A${r} ${r} 0 0 ${s1} ${mx} ${ay + r * sy}`; p += ` L${mx} ${by - r * sy}`;
      const s2 = (sx === 1 && sy === 1) || (sx === -1 && sy === -1) ? 0 : 1;
      p += ` A${r} ${r} 0 0 ${s2} ${mx + r * sx} ${by}`; p += ` L${bx} ${by}`;
      return p;
    }

    function updateLines(syncSpeed: boolean) {
      const gs = svg!.children;
      CONNS.forEach((c, i) => {
        const a = boxes[c[0]], b = boxes[c[1]], g = gs[i] as SVGGElement | undefined;
        if (!a || !b || !g) return;
        const d = buildOrthoPath(getBoxRect(a), getBoxRect(b));
        (g.children[0] as SVGPathElement).setAttribute("d", d);
        (g.children[1] as SVGPathElement).setAttribute("d", d);
        if (syncSpeed) {
          try {
            const len = (g.children[0] as SVGPathElement).getTotalLength();
            const am = g.children[2].querySelector("animateMotion");
            if (am) am.setAttribute("dur", `${Math.max(1.4, len / 150).toFixed(2)}s`);
          } catch { /* getTotalLength can throw before layout */ }
        }
      });
    }

    function buildLines() {
      let html = "";
      CONNS.forEach((c, i) => {
        const dark = (c[0] === "gateway" || c[1] === "gateway") ? " ax-dark" : "";
        html += `<g class="ax-cg${dark}" data-a="${c[0]}" data-b="${c[1]}">`
          + `<path id="axp${i}" class="ax-track" d=""/><path class="ax-flow" d=""/>`
          + `<circle class="ax-packet" r="4"><animateMotion dur="3s" begin="${i * 0.4}s" repeatCount="indefinite"><mpath href="#axp${i}" xlink:href="#axp${i}"/></animateMotion></circle></g>`;
      });
      svg!.innerHTML = html;
      updateLines(true);
    }

    function highlight(id: string, on: boolean) {
      svg!.querySelectorAll<SVGGElement>(".ax-cg").forEach((g) => {
        const rel = g.dataset.a === id || g.dataset.b === id;
        g.classList.toggle("ax-hot", on && rel);
        g.classList.toggle("ax-dim", on && !rel);
      });
    }

    function updateScale() {
      const w = wrap!.clientWidth; if (!w) return;
      if (root!.classList.contains("ax-fs")) {
        wrap!.style.height = "";
        const h = wrap!.clientHeight || 1;
        scale = Math.min(w / CW, h / CH);
        wrap!.style.overflow = "hidden";
        stage!.style.marginLeft = `${Math.max(0, (w - CW * scale) / 2)}px`;
        stage!.style.marginTop = `${Math.max(0, (h - CH * scale) / 2)}px`;
      } else {
        stage!.style.marginLeft = "0"; stage!.style.marginTop = "0";
        const fit = w / CW;
        if (fit >= MIN_SCALE) { scale = fit; wrap!.style.overflow = "hidden"; }
        else { scale = MIN_SCALE; wrap!.style.overflow = "auto hidden"; }
        wrap!.style.height = `${CH * scale}px`;
      }
      stage!.style.transform = `scale(${scale})`;
    }

    function startDrag(e: PointerEvent, el: HTMLElement) {
      if (window.innerWidth < 981) return;
      const t = e.target as HTMLElement;
      if (t.closest(".ax-mod-item") || t.closest(".ax-mod-head") || t.closest(".ax-cust-cta")) return;
      e.preventDefault();
      dragBox = el; moved = false; startX = e.clientX; startY = e.clientY;
      el.classList.add("ax-dragging"); svg!.classList.add("ax-busy");
      const r = el.getBoundingClientRect();
      dragOff.x = (e.clientX - r.left) / scale; dragOff.y = (e.clientY - r.top) / scale;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    function applyDrag() {
      raf = null; if (!dragBox || !pend) return; const e = pend;
      if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) moved = true;
      const sr = stage!.getBoundingClientRect();
      let x = (e.clientX - sr.left) / scale - dragOff.x, y = (e.clientY - sr.top) / scale - dragOff.y;
      x = Math.max(0, Math.min(CW - dragBox.offsetWidth, x)); y = Math.max(0, Math.min(CH - dragBox.offsetHeight, y));
      dragBox.style.left = `${x}px`; dragBox.style.top = `${y}px`; updateLines(false);
    }
    function onMove(e: PointerEvent) { if (!dragBox) return; e.preventDefault(); pend = e; if (!raf) raf = requestAnimationFrame(applyDrag); }
    function endDrag() { if (!dragBox) return; dragBox.classList.remove("ax-dragging"); dragBox = null; svg!.classList.remove("ax-busy"); updateLines(true); }

    function toggleFs() {
      const fs = root!.classList.toggle("ax-fs");
      fsBtn?.setAttribute("aria-pressed", fs ? "true" : "false");
      document.body.style.overflow = fs ? "hidden" : "";
      updateScale(); updateLines(false);
      timeouts.push(window.setTimeout(() => { updateScale(); updateLines(false); }, 80));
    }
    function reset() {
      boxEls.forEach((el) => { el.style.left = `${el.dataset.x ?? "0"}px`; el.style.top = `${el.dataset.y ?? "0"}px`; });
      timeouts.push(window.setTimeout(() => updateLines(true), 50));
    }

    // Per-box wiring: drag + click-to-open (click suppressed if it was a drag) + hover highlight.
    boxEls.forEach((el) => {
      const id = el.dataset.id ?? "";
      const onPointerDown = (e: PointerEvent) => startDrag(e, el);
      const onClick = (e: MouseEvent) => {
        if (moved) { moved = false; return; }
        const t = e.target as HTMLElement;
        if (t.closest(".ax-mod-item") || t.closest(".ax-mod-head") || t.closest(".ax-cust-cta")) return;
        open(id);
      };
      const onEnter = () => highlight(id, true);
      const onLeave = () => highlight(id, false);
      el.addEventListener("pointerdown", onPointerDown as EventListener);
      el.addEventListener("click", onClick as EventListener);
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("pointerdown", onPointerDown as EventListener);
        el.removeEventListener("click", onClick as EventListener);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
      });
    });

    // Inner clickable elements open their own modal (stopPropagation, like the original).
    root.querySelectorAll<HTMLElement>(".ax-mod-head, .ax-mod-item").forEach((el) => {
      const h = (e: Event) => { e.stopPropagation(); open(el.dataset.id ?? ""); };
      el.addEventListener("click", h); cleanups.push(() => el.removeEventListener("click", h));
    });
    const cta = root.querySelector<HTMLElement>(".ax-cust-cta");
    if (cta) { const h = (e: Event) => { e.stopPropagation(); open("customers"); }; cta.addEventListener("click", h); cleanups.push(() => cta.removeEventListener("click", h)); }

    const resetBtn = root.querySelector<HTMLButtonElement>("#ax-reset");
    if (resetBtn) { resetBtn.addEventListener("click", reset); cleanups.push(() => resetBtn.removeEventListener("click", reset)); }
    const fsBtn = root.querySelector<HTMLButtonElement>("#ax-fs");
    if (fsBtn) { fsBtn.addEventListener("click", toggleFs); cleanups.push(() => fsBtn.removeEventListener("click", toggleFs)); }

    const onUp = () => endDrag();
    document.addEventListener("pointermove", onMove as EventListener, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !modalOpenRef.current && root.classList.contains("ax-fs")) toggleFs(); };
    document.addEventListener("keydown", onKey);
    const onResize = () => { updateScale(); updateLines(false); };
    window.addEventListener("resize", onResize);

    // Boot: position, draw, then a few re-layouts as fonts/layout settle.
    updateScale(); buildLines();
    timeouts.push(window.setTimeout(() => { updateScale(); updateLines(true); }, 50));
    timeouts.push(window.setTimeout(() => { updateScale(); updateLines(true); }, 250));
    timeouts.push(window.setTimeout(() => { updateScale(); updateLines(true); }, 800));

    return () => {
      cleanups.forEach((c) => c());
      document.removeEventListener("pointermove", onMove as EventListener);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      timeouts.forEach((t) => clearTimeout(t));
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section className="apix-wf">
      <header className="apix-wf-head">
        <div className="eyebrow">airtuerk APIX</div>
        <h1>{title}</h1>
      </header>

      <div className="ax-wrap" id="ax-root" ref={rootRef}>
        <div className="ax-bar">
          <div>
            <h3 className="ax-title">APIX Workflow</h3>
            <p className="ax-sub">Drag boxes to rearrange · click any element to learn more</p>
          </div>
          <div className="ax-bar-btns">
            <button className="ax-reset" id="ax-reset" type="button"><RotateCcw />Reset</button>
            <button className="ax-reset" id="ax-fs" type="button" aria-pressed={false}>
              <span className="ic-on"><Maximize /></span>
              <span className="ic-off"><Minimize /></span>
              <span className="t-on">Fullscreen</span><span className="t-off">Exit</span>
            </button>
          </div>
        </div>

        <div className="ax-stage-wrap" id="ax-stage-wrap" ref={wrapRef}>
          <div className="ax-stage" id="ax-stage" ref={stageRef}>
            <svg className="ax-svg" id="ax-svg" ref={svgRef} viewBox="0 0 1900 900" preserveAspectRatio="none" />

            {SOURCES.map((s) => (
              <div key={s.id} className="ax-box ax-src" data-id={s.id} data-x={s.x} data-y={s.y} style={pos(s.x, s.y)}>
                <div className="ax-src-label">{s.label}</div>
                <div className="ax-src-img" style={{ backgroundImage: `url('${IMG[s.img]}')` }} />
              </div>
            ))}

            <div className="ax-box ax-streaming" data-id="streaming" data-x={350} data-y={400} style={pos(350, 400)}>
              <div className="ax-stream-icon"><Wifi /></div>
              <div className="ax-stream-label">Data Streaming</div>
            </div>

            {MODULES.map((m) => {
              const Head = ICONS[m.id];
              return (
                <div key={m.id} className="ax-box ax-mod" data-id={m.id} data-theme={m.theme} data-x={m.x} data-y={m.y} style={pos(m.x, m.y)}>
                  <div className="ax-mod-head" data-id={m.id}>
                    <span className="ax-mh-ico">{Head ? <Head /> : null}</span>{m.title}<span className="ax-mod-dots">···</span>
                  </div>
                  {m.items.map((it) => {
                    const Ico = ICONS[it.id];
                    return (
                      <div key={it.id} className="ax-mod-item" data-id={it.id}>
                        <span className="ax-mi-ico">{Ico ? <Ico /> : null}</span>{it.label}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="ax-box ax-gw" data-id="gateway" data-x={1320} data-y={320} style={pos(1320, 320)}>
              <div className="ax-gw-rings">
                <span className="ax-ring ax-ring-1" /><span className="ax-ring ax-ring-2" />
                <div className="ax-gw-circle"><CodeXml /></div>
              </div>
              <div className="ax-gw-label"><span>airtuerk</span> <b>API Gateway</b></div>
            </div>

            <div className="ax-box ax-cust" data-id="customers" data-x={1580} data-y={230} style={{ ...pos(1580, 230), backgroundImage: `url('${CUSTOMERS_BG}')` }}>
              <div className="ax-conn"><span className="ax-conn-ico"><CircleCheck /></span>Connected</div>
              <div className="ax-cust-overlay" />
              <div className="ax-cust-content">
                <div className="ax-cust-list"><div>Online Travel Agencies</div><div>Tour Operators</div><div>B2B Portals</div><div>Booking Engines</div></div>
                <button className="ax-cust-cta" type="button">+ More Info</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalId !== null ? (
        <WorkflowModal id={modalId} onClose={() => setModalId(null)} onOpen={open} onNav={navItem} contentRef={contentRef} />
      ) : null}
    </section>
  );
}

function WorkflowModal({
  id, onClose, onOpen, onNav, contentRef,
}: {
  id: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNav: (dir: number) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const d = DATA[id];
  if (!d) return null;
  const th = themeFor(id);
  const isItem = ITEM_ORDER.indexOf(id) > -1;
  const imgKey = d.img && IMG[d.img] ? d.img : null;
  const Icon = ICONS[id];
  const parent = d.parent && DATA[d.parent] ? d.parent : null;
  const noHero = !imgKey && !Icon;
  const cardStyle = { "--tc": th.c, "--tsoft": th.soft, "--tg1": th.g1, "--tg2": th.g2 } as CSSProperties;

  return (
    <div className="ax-modal ax-open" id="ax-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ax-modal-card${noHero ? " no-hero" : ""}`} style={cardStyle}>
        {parent ? (
          <button className="ax-mback" type="button" onClick={() => onOpen(parent)}>
            <ChevronLeft /><span>{DATA[parent].t}</span>
          </button>
        ) : null}
        <button className="ax-mclose" type="button" aria-label="Close" onClick={onClose}><X /></button>

        {imgKey ? (
          <div className="ax-modal-hero"><div className="ax-modal-hero-img" style={{ backgroundImage: `url('${IMG[imgKey]}')` }} /></div>
        ) : Icon ? (
          <div className="ax-modal-ihero">
            <div className="ax-ih-disc"><Icon /></div>
            {isItem ? (
              <>
                <button className="ax-ih-nav ax-ih-nav-l" type="button" aria-label="Previous" onClick={() => onNav(-1)}><ChevronLeft /></button>
                <button className="ax-ih-nav ax-ih-nav-r" type="button" aria-label="Next" onClick={() => onNav(1)}><ChevronRight /></button>
                <div className="ax-ih-count">{ITEM_ORDER.indexOf(id) + 1} / {ITEM_ORDER.length}</div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="ax-modal-content" ref={contentRef}>
          <div className="ax-modal-badge">{d.b}</div>
          <h3 className="ax-modal-title">
            <span className={`ax-mt-ico${Icon ? " is-on" : ""}`}>{Icon ? <Icon /> : null}</span>
            <span>{d.t}</span>
          </h3>
          {/* Trusted static content (no user input) — same as the original. */}
          <div className="ax-modal-body" dangerouslySetInnerHTML={{ __html: d.d }} />
          {d.items && d.items.length ? (
            <div className="ax-modal-items">
              <div className="ax-mi-title">Includes</div>
              <div className="ax-mi-grid">
                {d.items.map((iid) => DATA[iid] ? (
                  <button key={iid} className="ax-mi-card" type="button" onClick={() => onOpen(iid)}>{DATA[iid].t}<ChevronRight /></button>
                ) : null)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

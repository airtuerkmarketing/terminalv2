"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import worldData from "./data/countries-110m.json";
import "@/styles/apix-network.css";

/**
 * APIX Global Network — interactive map (Phase 4, Task 10c).
 *
 * Ported from the recovered embed, reusing the self-owned-stack pattern locked
 * by the Workflow port (commit dc53a50):
 *   • LIBRARIES bundled, never CDN: `d3` + `topojson-client` are npm deps; the
 *     original jsDelivr <script> loaders + window.d3/window.topojson are gone.
 *     countries-110m.json (world-atlas) is committed locally and imported — no
 *     runtime fetch. The map's icons are inline SVG (no lucide needed).
 *   • ASSETS on Supabase: the hub favicon → images/apix/map/, and only the 37
 *     country flags actually used → images/apix/flags/ (built from
 *     NEXT_PUBLIC_SUPABASE_URL). Zero flagcdn / website-files at runtime.
 *   • FONTS app-native: the original's Google Fonts <link>s are dropped; the
 *     map inherits var(--font) (pill widths self-measure from the rendered font).
 *
 * Structure mirrors the Workflow: static markup as JSX, the entire d3 engine
 * (projection, land, pills, drag/zoom, state tabs, dropdown, labels, fullscreen)
 * runs in one useEffect scoped to a root ref with full teardown — no window/DOM
 * at module scope, so the page SSRs/builds cleanly. The component holds no React
 * state (it renders once); the engine drives the DOM imperatively, exactly like
 * the original IIFE.
 */

type StateKey = "active" | "upcoming" | "office";
interface Country { name: string; code: string; lng: number; lat: number; hub?: boolean; state: StateKey; office?: boolean; role?: string }
// Runtime point = country + projected coords + d3/DOM handles (typed loosely —
// this is a faithful imperative port; the handles are d3 selections / DOM nodes).
interface Point extends Country {
  x: number; y: number; lx: number; ly: number; w?: number; h?: number;
  connection?: any; leader?: any; dot?: any; hit?: any; pill?: HTMLDivElement;}

const SB_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/apix/`;
const HUB_ICON = `${SB_BASE}map/at-favicon.svg`;
const FLAG = (c: string) => `${SB_BASE}flags/${c}.png`;

const WIDTH = 1400, HEIGHT = 720, ITER = 340;
const HUB_R = 13, OFFICE_R = 12;
const DEFAULT_STATE = "active";

// lucide.dev "building-2" path data (24×24) — drawn manually (not the lucide lib).
const BUILDING2 = ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", "M10 6h4", "M10 10h4", "M10 14h4", "M10 18h4"];

const STATE_META: Record<string, { label: string; color: string }> = {
  active: { label: "Doing business currently", color: "#0A82DF" },
  upcoming: { label: "Coming up next", color: "#F59E0B" },
  office: { label: "Our Offices", color: "#0557A6" },
};

// ── Market data — ported VERBATIM (hub Germany; 30 active, 6 upcoming, 3 offices) ──
const COUNTRIES: Country[] = [
  { name: "GERMANY", code: "de", lng: 10.45, lat: 51.16, hub: true, state: "active" },
  { name: "TÜRKİYE", code: "tr", lng: 35.24, lat: 39.00, state: "active" },
  { name: "IRAQ", code: "iq", lng: 43.68, lat: 33.00, state: "active" },
  { name: "GABON", code: "ga", lng: 11.60, lat: -0.80, state: "active" },
  { name: "IRELAND", code: "ie", lng: -8.00, lat: 53.20, state: "active" },
  { name: "BELGIUM", code: "be", lng: 4.60, lat: 50.60, state: "active" },
  { name: "UKRAINE", code: "ua", lng: 31.50, lat: 49.00, state: "active" },
  { name: "LIBYA", code: "ly", lng: 17.50, lat: 27.00, state: "active" },
  { name: "UNITED KINGDOM", code: "gb", lng: -2.00, lat: 54.00, state: "active" },
  { name: "AZERBAIJAN", code: "az", lng: 47.70, lat: 40.30, state: "active" },
  { name: "PALESTINE", code: "ps", lng: 35.20, lat: 31.90, state: "active" },
  { name: "KENYA", code: "ke", lng: 37.90, lat: 0.20, state: "active" },
  { name: "PAKISTAN", code: "pk", lng: 69.30, lat: 30.40, state: "active" },
  { name: "UNITED ARAB EMIRATES", code: "ae", lng: 54.30, lat: 24.00, state: "active" },
  { name: "FRANCE", code: "fr", lng: 2.40, lat: 46.60, state: "active" },
  { name: "MOROCCO", code: "ma", lng: -6.50, lat: 31.80, state: "active" },
  { name: "SAUDI ARABIA", code: "sa", lng: 45.00, lat: 24.00, state: "active" },
  { name: "NEPAL", code: "np", lng: 84.10, lat: 28.40, state: "active" },
  { name: "UNITED STATES", code: "us", lng: -98.0, lat: 39.50, state: "active" },
  { name: "CHINA", code: "cn", lng: 104.0, lat: 35.50, state: "active" },
  { name: "HONG KONG", code: "hk", lng: 114.2, lat: 22.30, state: "active" },
  { name: "UZBEKISTAN", code: "uz", lng: 64.50, lat: 41.50, state: "active" },
  { name: "INDONESIA", code: "id", lng: 113.0, lat: -1.50, state: "active" },
  { name: "INDIA", code: "in", lng: 79.00, lat: 22.00, state: "active" },
  { name: "ALGERIA", code: "dz", lng: 2.60, lat: 28.00, state: "active" },
  { name: "QATAR", code: "qa", lng: 51.20, lat: 25.30, state: "active" },
  { name: "GREECE", code: "gr", lng: 22.00, lat: 39.20, state: "active" },
  { name: "SYRIA", code: "sy", lng: 38.50, lat: 35.00, state: "active" },
  { name: "KYRGYZSTAN", code: "kg", lng: 74.80, lat: 41.30, state: "active" },
  { name: "KAZAKHSTAN", code: "kz", lng: 67.00, lat: 48.00, state: "active" },
  { name: "TAJIKISTAN", code: "tj", lng: 71.30, lat: 38.90, state: "active" },
  { name: "SERBIA", code: "rs", lng: 21.00, lat: 44.20, state: "upcoming" },
  { name: "BULGARIA", code: "bg", lng: 25.50, lat: 42.70, state: "upcoming" },
  { name: "SOUTH AFRICA", code: "za", lng: 25.00, lat: -29.0, state: "upcoming" },
  { name: "EGYPT", code: "eg", lng: 30.50, lat: 26.50, state: "upcoming" },
  { name: "NIGERIA", code: "ng", lng: 8.00, lat: 9.00, state: "upcoming" },
  { name: "SENEGAL", code: "sn", lng: -14.5, lat: 14.50, state: "upcoming" },
  { name: "FRANKFURT", code: "de", lng: 8.68, lat: 50.11, state: "office", office: true, role: "HQ" },
  { name: "ISTANBUL", code: "tr", lng: 28.98, lat: 41.01, state: "office", office: true, role: "BedBank" },
  { name: "ANTALYA", code: "tr", lng: 30.71, lat: 36.89, state: "office", office: true, role: "Service Center" },
];

export function ApixNetwork({ title }: { title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const stageEl = q<HTMLElement>("#apixStage");
    const pillsEl = q<HTMLElement>("#apixPills");
    const ddEl = q<HTMLElement>("#apixDropdown");
    const ddBtn = q<HTMLElement>("#apixDdBtn");
    const ddBtnFlag = q<HTMLElement>("#apixDdBtnFlag");
    const ddLabel = q<HTMLElement>("#apixDdBtnLabel");
    const ddSearch = q<HTMLInputElement>("#apixDdSearch");
    const ddList = q<HTMLElement>("#apixDdList");
    const labelsBtn = q<HTMLElement>("#apixLabelsBtn");
    const fsBtn = q<HTMLElement>("#apixFsBtn");
    const svgEl = stageEl.querySelector<SVGSVGElement>("svg")!;

    let alive = true;
    let activeGroup = DEFAULT_STATE;
    // d3 selection handles — element type varies per node, so typed loosely.
    let svgSel: any, gZoom: any, ringLayer: any, projection: any, zoom: any;
    let points: Point[] = [];
    let selected: Point | null = null;
    let activateFn: ((c: Point) => void) | null = null;
    let resizeObs: ResizeObserver | null = null;
    let labelTimer: number | undefined;
    const cleanups: Array<() => void> = [];
    const on = (el: EventTarget, type: string, handler: EventListener, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, handler, opts);
      cleanups.push(() => el.removeEventListener(type, handler, opts));
    };

    function render(linkLayer: any, leaderLayer: any, dotLayer: any, hubLayer: any, ringL: any, hitLayer: any) {      const hub = COUNTRIES.find((c) => c.hub)!;
      const hubPt = projection([hub.lng, hub.lat]);

      points = COUNTRIES.map((c) => {
        const p = projection([c.lng, c.lat]);
        return Object.assign({}, c, { state: c.state || DEFAULT_STATE, x: p[0], y: p[1], lx: p[0], ly: p[1] - 40 }) as Point;
      });

      // Hub → spoke curves (all non-hub points, incl. offices)
      points.filter((c) => !c.hub).forEach((c, i) => {
        const dx = c.x - hubPt[0], dy = c.y - hubPt[1], dist = Math.hypot(dx, dy) || 1;
        const mx = (hubPt[0] + c.x) / 2, my = (hubPt[1] + c.y) / 2;
        const amt = Math.min(dist * 0.18, 110);
        const cx = mx + (-dy / dist) * amt, cy = my + (dx / dist) * amt;
        c.connection = linkLayer.append("path").attr("class", "connection s-" + c.state)
          .attr("d", "M" + hubPt[0] + "," + hubPt[1] + " Q" + cx + "," + cy + " " + c.x + "," + c.y)
          .style("animation-delay", (i * 28) + "ms");
      });

      // HUB: white disc + company favicon + accent ring
      const hubGroup = hubLayer.append("g").attr("class", "hub-marker")
        .attr("transform", "translate(" + hubPt[0] + "," + hubPt[1] + ")");
      hubGroup.append("circle").attr("r", 11).attr("fill", "#fff");
      hubGroup.append("image")
        .attr("href", HUB_ICON).attr("xlink:href", HUB_ICON)
        .attr("x", -8).attr("y", -8).attr("width", 16).attr("height", 16)
        .attr("clip-path", "url(#apix-hub-clip)").attr("preserveAspectRatio", "xMidYMid meet");
      hubGroup.append("circle").attr("r", 11).attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", 2);
      hubGroup.append("circle").attr("r", 12).attr("fill", "none").attr("stroke", "#0A82DF").attr("stroke-width", 1.2).attr("opacity", .55);
      const hubPoint = points.find((p) => p.hub); if (hubPoint) hubPoint.dot = hubGroup;

      for (let i = 0; i < 2; i++)
        ringL.append("circle").attr("class", "hub-ring")
          .attr("cx", hubPt[0]).attr("cy", hubPt[1]).attr("r", 12)
          .style("animation-delay", (i * 1.2) + "s");

      // Markers + pills
      points.forEach((c, i) => {
        if (c.hub) return;
        c.leader = leaderLayer.append("line").attr("class", "leader")
          .attr("x1", c.x).attr("y1", c.y).attr("x2", c.lx).attr("y2", c.ly)
          .style("animation-delay", (600 + Math.random() * 300) + "ms");

        if (c.office) {
          const g = dotLayer.append("g").attr("class", "office-marker")
            .attr("transform", "translate(" + c.x + "," + c.y + ")")
            .style("animation-delay", (300 + i * 16) + "ms");
          g.append("rect").attr("class", "ofc-bg").attr("x", -10).attr("y", -10).attr("width", 20).attr("height", 20).attr("rx", 6);
          const ic = g.append("g").attr("transform", "translate(-6.5,-6.5) scale(0.542)");
          BUILDING2.forEach((p) => ic.append("path").attr("class", "ofc-ic").attr("d", p));
          c.dot = g;
        } else {
          c.dot = dotLayer.append("circle").attr("class", "country-dot s-" + c.state)
            .attr("cx", c.x).attr("cy", c.y).attr("r", 3.4)
            .style("animation-delay", (300 + i * 16) + "ms");
        }

        c.hit = hitLayer.append("circle").attr("class", "country-hit")
          .attr("cx", c.x).attr("cy", c.y).attr("r", c.office ? 16 : 13);

        const pill = document.createElement("div");
        pill.className = "apix-pill" + (c.office ? " is-office" : "");
        pill.style.animationDelay = (500 + i * 20) + "ms";
        pill.innerHTML = '<div class="apix-pill__flag"><img loading="lazy" alt="" src="' + FLAG(c.code) +
          '"></div><div class="apix-pill__label">' + c.name + "</div>" +
          (c.role ? '<div class="apix-pill__role">' + c.role + "</div>" : "");
        pillsEl.appendChild(pill); c.pill = pill;
      });

      // Hover wiring
      let timer: number | null = null, pending: Point | null = null;
      function activate(c: Point) {
        if (c.hub) return;
        if (timer && pending === c) { clearTimeout(timer); timer = null; }
        c.pill!.classList.add("is-hovered");
        c.leader.classed("is-active", true);
        c.connection.classed("is-active", true);
        if (c.office) c.dot.classed("is-hot", true);
        else c.dot.interrupt().transition().duration(160).attr("r", 5);
      }
      function deactivate(c: Point) {
        if (c.hub || c === selected) return;
        if (timer) clearTimeout(timer); pending = c;
        timer = window.setTimeout(() => {
          c.pill!.classList.remove("is-hovered");
          c.leader.classed("is-active", false);
          c.connection.classed("is-active", false);
          if (c.office) c.dot.classed("is-hot", false);
          else c.dot.interrupt().transition().duration(160).attr("r", 3.4);
          timer = null;
        }, 150);
      }
      points.forEach((c) => {
        if (c.hub) return;
        c.hit.on("mouseenter", () => activate(c)).on("mouseleave", () => deactivate(c));
        c.pill!.addEventListener("mouseenter", () => activate(c));
        c.pill!.addEventListener("mouseleave", () => deactivate(c));
        c.pill!.addEventListener("click", () => selectCountry(c));
      });
      activateFn = activate;
    }

    // AUTO LABEL PLACEMENT (visible labels only; avoids hub + office markers)
    function layoutLabels() {
      if (!points.length) return;
      const ratio = stageEl.clientWidth / WIDTH; if (!ratio) return;
      const vis = points.filter((c) => c.pill && c.pill.style.display !== "none");
      if (!vis.length) return;
      vis.forEach((c) => { c.w = c.pill!.offsetWidth / ratio + 8; c.h = c.pill!.offsetHeight / ratio + 8; });

      const mx = d3.mean(vis, (p) => p.x) ?? 0, my = d3.mean(vis, (p) => p.y) ?? 0;
      vis.forEach((c) => {
        let a = Math.atan2(c.y - my, c.x - mx); if (!isFinite(a)) a = -Math.PI / 2;
        const r0 = 30 / ratio; c.lx = c.x + Math.cos(a) * r0; c.ly = c.y + Math.sin(a) * r0;
      });

      const target = 24 / ratio, dotPad = 6 / ratio;
      for (let it = 0; it < ITER; it++) {
        vis.forEach((c) => {
          const dx = c.lx - c.x, dy = c.ly - c.y, d = Math.hypot(dx, dy) || 0.01;
          const f = (d - target) * 0.06; c.lx -= dx / d * f; c.ly -= dy / d * f;
        });
        for (let i = 0; i < vis.length; i++)
          for (let j = i + 1; j < vis.length; j++) {
            const a = vis[i], b = vis[j], dx = b.lx - a.lx, dy = b.ly - a.ly;
            const ox = (a.w! / 2 + b.w! / 2) - Math.abs(dx), oy = (a.h! / 2 + b.h! / 2) - Math.abs(dy);
            if (ox > 0 && oy > 0) {
              if (ox < oy) { const s = (dx < 0 ? -1 : 1) * ox / 2; a.lx -= s; b.lx += s; }
              else { const s = (dy < 0 ? -1 : 1) * oy / 2; a.ly -= s; b.ly += s; }
            }
          }
        vis.forEach((c) => points.forEach((o) => {
          if (o === c) return;
          const pad = o.hub ? HUB_R : (o.office ? OFFICE_R : dotPad);
          const dx = c.lx - o.x, dy = c.ly - o.y;
          const ox = (c.w! / 2 + pad) - Math.abs(dx), oy = (c.h! / 2 + pad) - Math.abs(dy);
          if (ox > 0 && oy > 0) { if (ox < oy) c.lx += (dx < 0 ? -1 : 1) * ox; else c.ly += (dy < 0 ? -1 : 1) * oy; }
        }));
        vis.forEach((c) => {
          c.lx = Math.max(c.w! / 2 + 2, Math.min(WIDTH - c.w! / 2 - 2, c.lx));
          c.ly = Math.max(c.h! / 2 + 2, Math.min(HEIGHT - c.h! / 2 - 2, c.ly));
        });
      }
      vis.forEach((c) => { if (c.leader) c.leader.attr("x1", c.x).attr("y1", c.y).attr("x2", c.lx).attr("y2", c.ly); });
      updateOverlay(d3.zoomTransform(svgSel.node()));
    }

    function updateOverlay(t: any) {      const ratio = stageEl.clientWidth / WIDTH; if (!ratio) return;
      points.forEach((c) => {
        if (!c.pill) return;
        c.pill.style.left = ((c.lx * t.k + t.x) * ratio) + "px";
        c.pill.style.top = ((c.ly * t.k + t.y) * ratio) + "px";
      });
    }

    function setupZoom() {
      zoom = d3.zoom().scaleExtent([1, 8]).translateExtent([[-220, -220], [WIDTH + 220, HEIGHT + 220]])
        .on("zoom", (e: any) => { gZoom.attr("transform", e.transform); updateOverlay(e.transform); });      svgSel.call(zoom).on("dblclick.zoom", null);
    }
    function zoomToCountry(c: Point, scale?: number) {
      const p = projection([c.lng, c.lat]);
      const t = d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(scale || 3.4).translate(-p[0], -p[1]);
      svgSel.transition().duration(800).ease(d3.easeCubicOut).call(zoom.transform, t);
    }
    function pulse(c: Point) {
      const ring = ringLayer.append("circle").attr("class", "apix-pulse")
        .attr("cx", c.x).attr("cy", c.y).attr("r", c.hub ? 13 : (c.office ? 14 : 10));
      window.setTimeout(() => ring.remove(), 3700);
    }

    function applyFilters() {
      points.forEach((c) => {
        const isOn = c.hub || c.state === activeGroup;
        const disp = isOn ? "" : "none";
        c.dot && c.dot.style("display", disp);
        c.connection && c.connection.style("display", disp);
        c.hit && c.hit.style("display", disp);
        c.leader && c.leader.style("display", disp);
        if (c.pill) c.pill.style.display = disp;
      });
    }
    function setActiveGroup(s: string) {
      if (!STATE_META[s] || s === activeGroup) {
        root!.querySelectorAll<HTMLElement>(".apix-state[data-state]").forEach((b) =>
          b.setAttribute("aria-pressed", b.dataset.state === activeGroup ? "true" : "false"));
        return;
      }
      activeGroup = s;
      root!.querySelectorAll<HTMLElement>(".apix-state[data-state]").forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.state === s ? "true" : "false"));
      clearHighlight(); applyFilters();
      window.setTimeout(layoutLabels, 30);
    }
    function updateStateCounts() {
      const counts: Record<string, number> = { active: 0, upcoming: 0, office: 0 };
      points.forEach((c) => { if (!c.hub && Object.prototype.hasOwnProperty.call(counts, c.state)) counts[c.state]++; });
      Object.keys(counts).forEach((s) => {
        const el = root!.querySelector("#apixCount-" + s);
        if (el) el.textContent = String(counts[s]);
      });
    }

    function clearHighlight() {
      if (!selected) return;
      if (selected.pill) selected.pill.classList.remove("is-hovered");
      if (selected.leader) selected.leader.classed("is-active", false);
      if (selected.connection) selected.connection.classed("is-active", false);
      if (selected.dot && !selected.hub) {
        if (selected.office) selected.dot.classed("is-hot", false);
        else selected.dot.interrupt().transition().duration(160).attr("r", 3.4);
      }
      selected = null;
    }
    function selectCountry(c: Point | null) {
      closeDropdown(); clearHighlight();
      if (!c) {
        ddLabel.textContent = "All countries"; ddBtnFlag.innerHTML = "";
        svgSel.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
        return;
      }
      if (!c.hub && c.state !== activeGroup) setActiveGroup(c.state);
      ddLabel.textContent = c.name.charAt(0) + c.name.slice(1).toLowerCase() + (c.role ? " · " + c.role : "");
      ddBtnFlag.innerHTML = '<img alt="" src="' + FLAG(c.code) + '">';
      selected = c; if (!c.hub && activateFn) activateFn(c); pulse(c); zoomToCountry(c);
    }

    function buildDropdown() {
      const sorted = points.slice().sort((a, b) => a.name.localeCompare(b.name));
      ddList.innerHTML = ""; ddList.appendChild(makeItem(null)); sorted.forEach((c) => ddList.appendChild(makeItem(c)));
    }
    function makeItem(c: Point | null) {
      const el = document.createElement("div"); el.className = "apix-dd__item" + (c ? "" : " is-all");
      if (c) {
        el.dataset.search = (c.name + " " + (c.role || "")).toLowerCase();
        el.innerHTML = '<div class="apix-dd__iflag"><img alt="" src="' + FLAG(c.code) +
          '"></div><div class="apix-dd__iname">' + c.name.toLowerCase() + (c.role ? " · " + c.role : "") +
          '</div><div class="apix-dd__idot" style="background:' + (STATE_META[c.state] ? STATE_META[c.state].color : "#0A82DF") + '"></div>';
      } else { el.dataset.search = "all countries reset"; el.textContent = "All countries"; }
      el.addEventListener("click", () => selectCountry(c)); return el;
    }
    function filterList() {
      const query = ddSearch.value.trim().toLowerCase(); let any = false;
      ddList.querySelectorAll<HTMLElement>(".apix-dd__item").forEach((it) => {
        const show = !query || (it.dataset.search ?? "").indexOf(query) > -1; it.style.display = show ? "" : "none";
        if (show && !it.classList.contains("is-all")) any = true;
      });
      let empty = ddList.querySelector(".apix-dd__empty");
      if (!any && query) {
        if (!empty) { empty = document.createElement("div"); empty.className = "apix-dd__empty"; empty.textContent = "No countries found"; ddList.appendChild(empty); }
      } else if (empty) empty.remove();
    }
    function openDropdown() { ddEl.classList.add("is-open"); ddBtn.setAttribute("aria-expanded", "true"); window.setTimeout(() => ddSearch.focus(), 30); }
    function closeDropdown() { ddEl.classList.remove("is-open"); ddBtn.setAttribute("aria-expanded", "false"); }

    function toggleFullscreen() {
      const fs = root!.classList.toggle("is-fullscreen");
      fsBtn.setAttribute("aria-pressed", fs ? "true" : "false");
      document.body.style.overflow = fs ? "hidden" : "";
      window.setTimeout(layoutLabels, 60); window.setTimeout(layoutLabels, 280);
    }

    function wireControls() {
      root!.querySelectorAll<HTMLElement>(".apix-state[data-state]").forEach((btn) =>
        on(btn, "click", () => setActiveGroup(btn.dataset.state ?? DEFAULT_STATE)));
      on(labelsBtn, "click", () => {
        const off = root!.classList.toggle("labels-off"); labelsBtn.setAttribute("aria-pressed", off ? "true" : "false");
      });
      on(fsBtn, "click", toggleFullscreen);
      on(q("#apixZoomIn"), "click", () => svgSel.transition().duration(250).call(zoom.scaleBy, 1.5));
      on(q("#apixZoomOut"), "click", () => svgSel.transition().duration(250).call(zoom.scaleBy, 1 / 1.5));
      on(q("#apixZoomReset"), "click", () => { clearHighlight(); svgSel.transition().duration(550).call(zoom.transform, d3.zoomIdentity); });
      on(ddBtn, "click", (e) => { e.stopPropagation(); ddEl.classList.contains("is-open") ? closeDropdown() : openDropdown(); });
      on(ddSearch, "input", filterList);
      on(ddSearch, "click", (e) => e.stopPropagation());
      on(document, "click", (e) => { if (!ddEl.contains(e.target as Node)) closeDropdown(); });
      on(document, "keydown", (e) => {
        if ((e as KeyboardEvent).key === "Escape") { closeDropdown(); if (root!.classList.contains("is-fullscreen")) toggleFullscreen(); }
      });
    }

    function init(world: any) {      svgSel = d3.select(svgEl);
      projection = d3.geoMercator().scale(245).center([30, 28]).translate([WIDTH / 2, HEIGHT / 2 + 70]);
      const path = d3.geoPath().projection(projection);

      svgSel.append("defs").append("clipPath").attr("id", "apix-hub-clip").append("circle").attr("r", 11);

      gZoom = svgSel.append("g");
      const landLayer = gZoom.append("g");
      const linkLayer = gZoom.append("g");
      const leaderLayer = gZoom.append("g");
      const dotLayer = gZoom.append("g");
      const hubLayer = gZoom.append("g");
      ringLayer = gZoom.append("g");
      const hitLayer = gZoom.append("g");

      const land: any = feature(world, world.objects.countries);      landLayer.selectAll("path").data(land.features).join("path").attr("class", "land").attr("d", path);

      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
        if (!alive) return; // unmounted during font wait
        render(linkLayer, leaderLayer, dotLayer, hubLayer, ringLayer, hitLayer);
        setupZoom(); buildDropdown(); wireControls();
        updateStateCounts(); applyFilters();
        if (window.matchMedia("(max-width:720px)").matches) {
          root!.classList.add("labels-off"); labelsBtn.setAttribute("aria-pressed", "true");
        }
        layoutLabels();
        resizeObs = new ResizeObserver(() => { clearTimeout(labelTimer); labelTimer = window.setTimeout(layoutLabels, 120); });
        resizeObs.observe(stageEl);
      });
    }

    init(worldData as any);
    return () => {
      alive = false;
      resizeObs?.disconnect();
      clearTimeout(labelTimer);
      cleanups.forEach((c) => c());
      // d3-zoom binds its listeners to the <svg> node itself (which React keeps);
      // innerHTML="" only clears children, so drop the zoom listeners explicitly.
      if (svgSel) svgSel.on(".zoom", null);
      // Reset the DOM so a StrictMode re-mount (dev) re-inits cleanly, and free listeners.
      svgEl.innerHTML = "";
      pillsEl.innerHTML = "";
      root.classList.remove("is-fullscreen", "labels-off");
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <section className="apix-net">
      <header className="apix-net-head">
        <div className="eyebrow">airtuerk APIX</div>
        <h1>{title}</h1>
      </header>

      <section className="apix-mw" id="apixMap" ref={rootRef}>
        <div className="apix-mw-stage" id="apixStage">
          <svg viewBox="0 0 1400 720" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" />
          <div className="apix-mw-pills" id="apixPills" />
        </div>

        <div className="apix-controls" id="apixControls">
          {/* Single-select filter toggles. The original used role=tab/tablist with
              aria-pressed (an ARIA mismatch); these are toggle buttons, so plain
              <button aria-pressed> is the correct, warning-free form. */}
          <div className="apix-glass apix-cgroup" id="apixStates">
            <button className="apix-state" data-state="active" aria-pressed={true} type="button">
              <span className="apix-state__dot" />Doing business currently
              <span className="apix-state__count" id="apixCount-active">0</span>
            </button>
            <button className="apix-state" data-state="upcoming" aria-pressed={false} type="button">
              <span className="apix-state__dot" />Coming up next
              <span className="apix-state__count" id="apixCount-upcoming">0</span>
            </button>
            <button className="apix-state" data-state="office" aria-pressed={false} type="button">
              <span className="apix-state__dot" />Our Offices
              <span className="apix-state__count" id="apixCount-office">0</span>
            </button>
          </div>

          <div className="apix-cgroup" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
            <div className="apix-dd" id="apixDropdown">
              <button className="apix-dd__btn" id="apixDdBtn" type="button" aria-haspopup="listbox" aria-expanded={false}>
                <span className="apix-dd__btnflag" id="apixDdBtnFlag" />
                <span className="apix-dd__btnlabel" id="apixDdBtnLabel">All countries</span>
                <svg className="apix-dd__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <div className="apix-glass apix-dd__panel" role="listbox">
                <input className="apix-dd__search" id="apixDdSearch" type="text" placeholder="Search country…" autoComplete="off" />
                <div className="apix-dd__list" id="apixDdList" />
              </div>
            </div>

            <button className="apix-glass apix-iconbtn" id="apixLabelsBtn" type="button" aria-pressed={false} title="Toggle labels">
              <svg className="ic-on" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              <svg className="ic-off" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            </button>

            <button className="apix-glass apix-iconbtn" id="apixFsBtn" type="button" aria-pressed={false} title="Fullscreen">
              <svg className="ic-on" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
              <svg className="ic-off" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
            </button>
          </div>
        </div>

        <div className="apix-glass apix-zoom" id="apixZoom">
          <button id="apixZoomIn" type="button" title="Zoom in">+</button>
          <div className="apix-zoom__sep" />
          <button id="apixZoomReset" type="button" title="Reset view" style={{ fontSize: 15 }}>⤾</button>
          <div className="apix-zoom__sep" />
          <button id="apixZoomOut" type="button" title="Zoom out">−</button>
        </div>
      </section>
    </section>
  );
}

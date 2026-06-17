"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "@/styles/apix-group.css";

/**
 * APIX Group Structure — AERTiCKET Group org chart (Phase 4, Task 10d). The
 * fourth and final APIX tool. Reuses the locked pattern (Workflow dc53a50, Map
 * c5390d1, Presentation 3fbb05d):
 *   • LIBRARIES bundled, never CDN: `leaflet` is an npm dep, imported locally
 *     (CSS at module scope; the JS via a client-only dynamic import inside the
 *     effect so the page still SSRs — leaflet touches window at load). The
 *     original's unpkg <link>/<script> lazy-loader is gone. Icons are inline SVG.
 *   • CARTO map tiles stay external: the per-entity modal map uses the
 *     basemaps.cartocdn.com tile layer + CARTO/OSM attribution — third-party map
 *     infrastructure, the one allowed external request (like the SharePoint
 *     iframe in the presentation player). Markers are CSS divIcons (no default
 *     Leaflet marker images load — no CDN, no bundler-icon gotcha).
 *   • FONTS app-native: the original Google Fonts (Inter) are dropped; inherits
 *     var(--font). Chrome = the page header (tokens); the org chart + map are
 *     CONTENT, preserved verbatim.
 *
 * Structure mirrors the Map: static markup as JSX, the whole engine (render
 * cards, pointer drag-reorder, detail modal + lazy Leaflet) in one useEffect
 * scoped to a root ref with full teardown (map.remove(), listeners, body lock).
 * No React state, no window/DOM at module scope → builds/SSRs cleanly.
 */

interface Item { name: string; sub?: string; lat?: number | null; lng?: number | null; founded?: number | null; desc?: string; self?: boolean }
interface Column { title: string; color: string; bg: string; border: string; icon: string[]; items: Item[] }

// ── Group structure data — ported VERBATIM (4 columns) ──
const COLUMNS: Column[] = [
  {
    title: "Consolidator National",
    color: "#0A82DF", bg: "#EFF6FE", border: "#BFDDF8",
    icon: ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", "M10 6h4", "M10 10h4", "M10 14h4", "M10 18h4"],
    items: [
      { name: "AERTiCKET Conso", sub: "Berlin (DE)", lat: 52.490, lng: 13.412, founded: 1993, desc: "The nucleus of the group: founded in 1993 as consolidator AER Reiseservice, with roots in Titanic Reisen, the Berlin-Kreuzberg travel agency started by Rainer Klee in 1988." },
      { name: "TSS AERTiCKET Service", sub: "Leipzig (DE)", lat: 51.340, lng: 12.375, founded: 2005, desc: "Consolidator joint venture with the TSS cooperation: airline tickets and travel services for travel agencies, tour operators and portals." },
      { name: "rtk ticketplus Travel Service", sub: "Burghausen (DE)", lat: 48.169, lng: 12.831, founded: null, desc: "Consolidator joint venture with the RTK travel agency cooperation — following the AERTiCKET model: parent company plus joint ventures with cooperations." },
      { name: "BEST AERTiCKET Service", sub: "Filderstadt (DE)", lat: 48.658, lng: 9.220, founded: null, desc: "Consolidator directly attached to the BEST-REISEN cooperation: IATA services, tour operator fares and ticketing from Filderstadt." },
      { name: "Team Travel", sub: "Düsseldorf (DE)", lat: 51.228, lng: 6.773, founded: null, desc: "" },
      { name: "airtuerk Service", sub: "Frankfurt am Main (DE)", lat: 50.107, lng: 8.664, founded: 2007, desc: "Leading airline ticket wholesaler focused on Turkish travel agencies and holiday destinations. Around 170 airlines, the multicheck, cockpit, holidays & myBooking platforms — service in German, English and Turkish, around the clock.", self: true },
      { name: "World of Conso", sub: "Düsseldorf (DE)", lat: 51.215, lng: 6.781, founded: null, desc: "Flight consolidator of the Explorer Travel Group in Düsseldorf." },
    ],
  },
  {
    title: "Consolidator International",
    color: "#7C3AED", bg: "#F6F1FE", border: "#DFD0FA",
    icon: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", "M2 12h20"],
    items: [
      { name: "Global Ticket Factory", sub: "Berlin (DE)", lat: 52.490, lng: 13.412, founded: 2023, desc: "Serves the group's international customers outside Germany; founded in the course of the international expansion." },
      { name: "AERTiCKET Austria", sub: "Innsbruck (AT)", lat: 47.269, lng: 11.404, founded: null, desc: "Consolidator for the Austrian market — AERTiCKET has been active in Austria since the 2000s." },
      { name: "AERTiCKET Switzerland", sub: "Zürich (CH)", lat: 47.377, lng: 8.541, founded: 2019, desc: "Founded in Zurich in 2019 as AERTiCKET Suisse; cooperating with Globetrotter Travel Service since 2021 and in a strategic partnership with Hotelplan Suisse since 2023." },
      { name: "AERTiCKET Spain", sub: "Palma de Mallorca (ES)", lat: 39.570, lng: 2.650, founded: null, desc: "Consolidator for the Spanish market, based in Mallorca." },
      { name: "Hooray", sub: "Ilawa (PL)", lat: 53.596, lng: 19.566, founded: null, desc: "Consolidator for the Polish market." },
      { name: "Picasso Travel / Panorama Travel", sub: "Los Angeles, New York (US)", lat: 34.052, lng: -118.244, founded: 1979, desc: "One of North America's largest air consolidators, in business since 1979 — and the largest consolidator of the AERTiCKET Group. The partnership with AERTiCKET (AER Picasso) dates back to 2008." },
      { name: "AERTiCKET France", sub: "Paris (FR)", lat: 48.857, lng: 2.352, founded: 2016, desc: "Joint venture with the French travel agency network Tourcom — the group's first step into the French market." },
      { name: "CMS Vacances", sub: "Bordeaux (FR)", lat: 44.838, lng: -0.579, founded: null, desc: "Expert in fulfillment, call centers and airline ticket wholesale; acquired from BNP Paribas in November 2019. Bordeaux is the group's most important location after Berlin." },
      { name: "AERTiCKET Brazil", sub: "São Paulo (BR)", lat: -23.551, lng: -46.633, founded: 2022, desc: "Founded in 2022 — the expansion into South America's largest domestic market." },
      { name: "AERTiCKET UK", sub: "London (UK)", lat: 51.507, lng: -0.128, founded: null, desc: "Part of the group since 2021 through the acquisition of the Emerald UK consolidator business — the foothold in Great Britain." },
      { name: "BiletBank", sub: "Istanbul (TR)", lat: 41.008, lng: 28.978, founded: 2008, desc: "Türkiye's leading online B2B consolidator (brand launched in 2008, with roots in the Akdeniz PE-TUR agency founded in 1982). AERTiCKET acquired 50% in 2020 and took over completely in 2022." },
      { name: "Skyways", sub: "Brussels (BE)", lat: 50.847, lng: 4.352, founded: null, desc: "Belgian flight ticket consolidator, part of the AERTiCKET Group since August 2022." },
      { name: "AERTiCKET Denmark", sub: "Malmö (SE), Copenhagen (DK)", lat: 55.605, lng: 13.003, founded: null, desc: "Emerged from the Scandinavian B2B consolidator Inca Tickets (formerly Inca Tours), acquired in 2024 — the entry into the Nordic market." },
      { name: "AERTiCKET India", sub: "Mumbai (IND)", lat: 19.076, lng: 72.878, founded: 2024, desc: "Founded in 2024 as Raviwo AERTiCKET Alliance India; offices in Mumbai, Kochi and Ahmedabad." },
      { name: "Servivuelo", sub: "Madrid (ES)", lat: 40.417, lng: -3.703, founded: null, desc: "Madrid-based consolidator, acquired in 2025 — strengthening the group's presence in the Spanish market." },
    ],
  },
  {
    title: "Service & Procurement",
    color: "#16A34A", bg: "#ECFDF3", border: "#BBE9CD",
    icon: ["m12.83 2.18 8.11 4.06a1 1 0 0 1 0 1.79l-8.11 4.06a2 2 0 0 1-1.66 0L3.06 8.03a1 1 0 0 1 0-1.79l8.11-4.06a2 2 0 0 1 1.66 0Z", "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65", "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"],
    items: [
      { name: "AERUNI", sub: "Fulfillment", lat: 51.340, lng: 12.373, founded: 2008, desc: "The group's fulfillment and payment processing partner for booking portals, based in Leipzig." },
      { name: "AFL", sub: "Scheduled Flight Procurement · Berlin (DE)", lat: 52.490, lng: 13.412, founded: null, desc: "Central scheduled flight procurement of the group, based in Berlin." },
      { name: "French Travel Alliance", sub: "Scheduled Flight Procurement", lat: null, lng: null, founded: 2019, desc: "50/50 joint venture between AERTiCKET and Penguin World (Resaneo), founded in December 2019: pools flight purchasing for the French market." },
    ],
  },
  {
    title: "Technology",
    color: "#EA580C", bg: "#FFF3EB", border: "#FBD7BC",
    icon: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
    items: [
      { name: "AER Technology Holding", sub: "Service and IT Services · Berlin (DE)", lat: 52.490, lng: 13.412, founded: null, desc: "Holding for the group's central service and IT companies, based in Berlin." },
      { name: "Technoly", sub: "Software Development", lat: 52.490, lng: 13.412, founded: null, desc: "Builds smart software solutions for the travel industry — with teams in Berlin, Aschaffenburg and Kyiv, among others; the Technoly İstanbul site opened in 2022 at Zaim Teknopark." },
      { name: "AIC Ukraine", sub: "Service Center/Software Development", lat: 50.450, lng: 30.524, founded: null, desc: "The AERTiCKET subsidiary aic co-develops the Cockpit booking world; service center and software development from Ukraine." },
      { name: "Global Conso Tech", sub: "Development · Berlin (DE)", lat: 52.490, lng: 13.412, founded: 2021, desc: "Holding founded in 2021 that created the structures for international growth — through it, partners jointly distribute airfares from more than 70 countries. Based in Berlin." },
      { name: "t.e.a.m.-CCS", sub: "3V Marketing Matching Engine · Berlin (DE)", lat: 52.490, lng: 13.412, founded: null, desc: "Operates the 3V marketing matching engine, based in Berlin." },
      { name: "ASNM New Media", sub: "B2C IBE Sales · Berlin (DE)", lat: 52.490, lng: 13.412, founded: null, desc: "B2C internet booking engine sales, based in Berlin." },
    ],
  },
];

const GRIP = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/><circle cx="2.5" cy="13.5" r="1.5"/><circle cx="7.5" cy="13.5" r="1.5"/></svg>';
const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const CAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

function hexShadow(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + ",.2)";
}
function esc(s: unknown) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] as string));
}

export function ApixGroup({ title }: { title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const colsEl = q<HTMLElement>("#apixOrgCols");
    const resetBtn = q<HTMLElement>("#apixOrgReset");
    const modal = q<HTMLElement>("#apixOrgModal");
    const modalMapEl = q<HTMLElement>("#apixOrgModalMap");
    const modalChips = q<HTMLElement>("#apixOrgModalChips");
    const modalTitle = q<HTMLElement>("#apixOrgModalTitle");
    const modalLoc = q<HTMLElement>("#apixOrgModalLoc");
    const modalDesc = q<HTMLElement>("#apixOrgModalDesc");
    const modalClose = q<HTMLElement>("#apixOrgModalClose");

    interface Drag { card: HTMLElement; list: HTMLElement; startX: number; startY: number; active: boolean; offX: number; offY: number; ghost?: HTMLElement }
    let drag: Drag | null = null;
    let blockClick = false;
    // leaflet handle + live map instance (loosely typed — imperative engine).
    let Lmod: any = null;
    let leafletMap: any = null;
    const cleanups: Array<() => void> = [];
    const on = (el: EventTarget, type: string, fn: EventListener) => {
      el.addEventListener(type, fn);
      cleanups.push(() => el.removeEventListener(type, fn));
    };

    // Leaflet is bundled; load it client-side via dynamic import (keeps SSR clean).
    function loadLeaflet() {
      if (Lmod) return Promise.resolve(Lmod);
      return import("leaflet").then((m) => { Lmod = (m as { default?: unknown }).default ?? m; return Lmod; });
    }

    function render() {
      colsEl.innerHTML = "";
      COLUMNS.forEach((col, ci) => {
        const colEl = document.createElement("div");
        colEl.className = "apix-org-col";

        const head = document.createElement("div");
        head.className = "apix-org-colhead";
        head.style.background = col.bg;
        head.style.borderColor = col.border;
        head.style.color = col.color;
        head.style.animationDelay = (ci * 70) + "ms";
        head.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          col.icon.map((d) => '<path d="' + d + '"/>').join("") + "</svg>" +
          "<span>" + esc(col.title) + "</span>" +
          '<span class="apix-org-colhead__count"><span>' + col.items.length + "</span></span>";
        colEl.appendChild(head);

        const list = document.createElement("div");
        list.className = "apix-org-list";
        col.items.forEach((it, i) => {
          const card = document.createElement("div");
          card.className = "apix-org-card" + (it.self ? " is-self" : "");
          card.style.setProperty("--col", col.color);
          card.style.setProperty("--colShadow", hexShadow(col.color));
          card.style.animationDelay = (ci * 70 + 80 + i * 35) + "ms";
          card.innerHTML =
            '<span class="apix-org-card__grip">' + GRIP + "</span>" +
            '<div class="apix-org-card__title">' + esc(it.name) + "</div>" +
            (it.sub ? '<div class="apix-org-card__sub">' + esc(it.sub) + "</div>" : "");
          wireDrag(card, list);
          card.addEventListener("click", (e) => {
            if (blockClick) return;
            if ((e.target as HTMLElement).closest(".apix-org-card__grip")) return;
            openModal(it, col);
          });
          list.appendChild(card);
        });
        colEl.appendChild(list);
        colsEl.appendChild(colEl);
      });
    }

    /* ── Pointer-based drag & drop (mouse + touch), within own column ── */
    function wireDrag(card: HTMLElement, list: HTMLElement) {
      card.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== undefined && e.button !== 0) return;
        const onGrip = (e.target as HTMLElement).closest(".apix-org-card__grip");
        // mouse: drag from anywhere · touch/pen: only from the grip
        if (e.pointerType !== "mouse" && !onGrip) return;
        if (onGrip) e.preventDefault();
        const r = card.getBoundingClientRect();
        drag = { card, list, startX: e.clientX, startY: e.clientY, active: false, offX: e.clientX - r.left, offY: e.clientY - r.top };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp, { once: true });
        window.addEventListener("pointercancel", onUp, { once: true });
      });
    }
    function startDrag(e: PointerEvent) {
      if (!drag) return;
      const r = drag.card.getBoundingClientRect();
      const ghost = drag.card.cloneNode(true) as HTMLElement;
      ghost.classList.add("apix-org-drag-ghost");
      ghost.classList.remove("is-ghosted");
      ghost.style.width = r.width + "px";
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      drag.card.classList.add("is-ghosted");
      root!.classList.add("is-dragging");
      moveGhost(e);
    }
    function moveGhost(e: PointerEvent) {
      if (!drag?.ghost) return;
      drag.ghost.style.left = (e.clientX - drag.offX) + "px";
      drag.ghost.style.top = (e.clientY - drag.offY) + "px";
    }
    function onMove(e: PointerEvent) {
      if (!drag) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
        drag.active = true; startDrag(e);
      }
      e.preventDefault();
      moveGhost(e);
      const sibs = Array.from(drag.list.children).filter((el) => el !== drag!.card) as HTMLElement[];
      let after: HTMLElement | null = null;
      for (const s of sibs) {
        const r = s.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { after = s; break; }
      }
      if (after) { if (after !== drag.card.nextSibling) drag.list.insertBefore(drag.card, after); }
      else if (drag.list.lastElementChild !== drag.card) drag.list.appendChild(drag.card);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      if (drag) {
        if (drag.ghost) drag.ghost.remove();
        drag.card.classList.remove("is-ghosted");
        root!.classList.remove("is-dragging");
        if (drag.active) { blockClick = true; setTimeout(() => { blockClick = false; }, 50); }
      }
      drag = null;
    }

    /* ── Detail modal ── */
    function openModal(it: Item, col: Column) {
      const hasMap = it.lat != null && it.lng != null;
      modal.classList.toggle("has-map", hasMap);

      modalChips.innerHTML =
        '<span class="apix-org-chip apix-org-chip--cat" style="--chipBg:' + col.bg +
        ';--chipCol:' + col.color + ';--chipBorder:' + col.border + '">' + esc(col.title) + "</span>" +
        (it.founded ? '<span class="apix-org-chip apix-org-chip--founded">' + CAL_ICON + "Founded " + esc(it.founded) + "</span>" : "") +
        (it.self ? '<span class="apix-org-chip apix-org-chip--self">That\'s us</span>' : "");
      modalTitle.textContent = it.name;
      modalLoc.innerHTML = it.sub ? (PIN_ICON + "<span>" + esc(it.sub) + "</span>") : "";
      modalLoc.style.display = it.sub ? "" : "none";
      modalDesc.textContent = it.desc || "";

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      if (hasMap) {
        loadLeaflet().then((L) => {
          if (!modal.classList.contains("is-open")) return; // closed during load
          if (leafletMap) { leafletMap.remove(); leafletMap = null; }
          leafletMap = L.map(modalMapEl, { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
            .setView([it.lat, it.lng], 11);
          L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd", maxZoom: 19,
          }).addTo(leafletMap);
          L.marker([it.lat, it.lng], {
            icon: L.divIcon({
              className: "",
              html: '<div class="apix-org-pin" style="--col:' + col.color + '"></div>',
              iconSize: [18, 18], iconAnchor: [9, 9],
            }),
          }).addTo(leafletMap);
          setTimeout(() => leafletMap && leafletMap.invalidateSize(), 220);
        }).catch(() => { modal.classList.remove("has-map"); });
      }
    }
    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    }

    on(modalClose, "click", () => closeModal());
    on(modal, "click", (e) => { if (e.target === modal) closeModal(); });
    on(document, "keydown", (e) => { if ((e as KeyboardEvent).key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
    on(resetBtn, "click", () => render());

    render();

    return () => {
      cleanups.forEach((c) => c());
      // Defensive: drop any in-flight drag listeners / ghost (unmount mid-drag).
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (drag?.ghost) drag.ghost.remove();
      if (leafletMap) { leafletMap.remove(); leafletMap = null; }
      document.body.style.overflow = "";
      colsEl.innerHTML = ""; // clean for a StrictMode re-mount (dev)
    };
  }, []);

  return (
    <section className="apix-group">
      <header className="apix-group-head">
        <div className="eyebrow">airtuerk APIX</div>
        <h1>{title}</h1>
      </header>

      <section className="apix-org" id="apixOrg" ref={rootRef}>
        <div className="apix-org-stage">
          <div className="apix-glass apix-org-top">
            <div className="apix-org-top__brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
              AERTiCKET Group
            </div>
            <div className="apix-org-top__meta">
              <span>100% subsidiary of AER e.V. · Founded by Rainer Klee</span>
              <button className="apix-org-reset" id="apixOrgReset" type="button" title="Reset order">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                Reset
              </button>
            </div>
          </div>
          <div className="apix-org-cols" id="apixOrgCols" />
        </div>

        <div className="apix-org-modal" id="apixOrgModal" role="dialog" aria-modal="true" aria-hidden="true">
          <div className="apix-org-modal__box">
            <button className="apix-org-modal__close" id="apixOrgModalClose" type="button" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <div className="apix-org-modal__map" id="apixOrgModalMap" />
            <div className="apix-org-modal__body">
              <div className="apix-org-modal__chips" id="apixOrgModalChips" />
              <div className="apix-org-modal__title" id="apixOrgModalTitle" />
              <div className="apix-org-modal__loc" id="apixOrgModalLoc" />
              <div className="apix-org-modal__desc" id="apixOrgModalDesc" />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

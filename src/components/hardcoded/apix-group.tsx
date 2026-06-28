"use client";

import { useEffect, useRef } from "react";
// GRP-02: leaflet's CSS stays a module-scope import, but the whole component is
// now an ssr:false lazy island (apix-lazy-islands.tsx), so this stylesheet rides
// the lazy group chunk and no longer ships in the route's eager CSS.
import "leaflet/dist/leaflet.css";
import "@/styles/apix-group.css";
import {
  COLUMNS,
  GRIP,
  PIN_ICON,
  CAL_ICON,
  TILE,
  BRAND,
  type Item,
  type Column,
} from "./apix-group.data";

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

function hexShadow(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + ",.2)";
}
function esc(s: unknown) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] as string));
}

export function ApixGroup({ title, embedded }: { title: string; embedded?: boolean }) {
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
    let mapTimer: ReturnType<typeof setTimeout> | undefined; // GRP-07: tracked so it can be cleared
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
          // CARTO light_all tiles are kept in BOTH app themes (not swapped for
          // dark_all in dark mode): the modal box is a light content surface
          // (#fff in both themes, like the org board), so a dark basemap inside
          // a white modal would clash. Accepted dark-mode exception (M5).
          L.tileLayer(TILE.url, {
            attribution: TILE.attribution,
            subdomains: TILE.subdomains, maxZoom: TILE.maxZoom,
          }).addTo(leafletMap);
          L.marker([it.lat, it.lng], {
            icon: L.divIcon({
              className: "",
              html: '<div class="apix-org-pin" style="--col:' + col.color + '"></div>',
              iconSize: [18, 18], iconAnchor: [9, 9],
            }),
          }).addTo(leafletMap);
          mapTimer = setTimeout(() => leafletMap && leafletMap.invalidateSize(), 220);
        }).catch(() => { modal.classList.remove("has-map"); });
      }
    }
    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      clearTimeout(mapTimer); // GRP-07: cancel a pending invalidateSize
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
      clearTimeout(mapTimer); // GRP-07: cancel a pending invalidateSize on unmount
      if (leafletMap) { leafletMap.remove(); leafletMap = null; }
      document.body.style.overflow = "";
      colsEl.innerHTML = ""; // clean for a StrictMode re-mount (dev)
    };
  }, []);

  return (
    <section className="apix-group">
      {!embedded && (
        <header className="apix-group-head">
          <div className="eyebrow">airtuerk APIX</div>
          <h1>{title}</h1>
        </header>
      )}

      <section className="apix-org" id="apixOrg" ref={rootRef}>
        <div className="apix-org-stage">
          <div className="apix-glass apix-org-top">
            <div className="apix-org-top__brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
              {BRAND.name}
            </div>
            <div className="apix-org-top__meta">
              <span>{BRAND.meta}</span>
              <button className="apix-org-reset" id="apixOrgReset" type="button" title="Reset order">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                Reset
              </button>
            </div>
          </div>
          {/* GRP-04: load-bearing — the effect's render() is the SOLE writer of
              this container (cards + drag reorder are imperative DOM, outside
              React). React must keep it empty so the two never fight. */}
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

/**
 * APIX Group Structure — content & config extracted from apix-group.tsx (GRP-06).
 * The AERTiCKET Group org structure (the sales content), the CARTO tile config,
 * the inline SVG icon glyphs, and the brand copy. Edit here without touching the
 * imperative board/map engine. Identifiers keep their names.
 */

export interface Item { name: string; sub?: string; lat?: number | null; lng?: number | null; founded?: number | null; desc?: string; self?: boolean }
export interface Column { title: string; color: string; bg: string; border: string; icon: string[]; items: Item[] }

// ── Group structure data — ported VERBATIM (4 columns) ──
export const COLUMNS: Column[] = [
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

export const GRIP = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/><circle cx="2.5" cy="13.5" r="1.5"/><circle cx="7.5" cy="13.5" r="1.5"/></svg>';
export const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
export const CAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

// CARTO light_all tiles — third-party basemap (the one allowed external request).
export const TILE = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
};

// Top-bar brand copy.
export const BRAND = {
  name: "AERTiCKET Group",
  meta: "100% subsidiary of AER e.V. · Founded by Rainer Klee",
};

/**
 * APIX Global Network — content & config (extracted from apix-network.tsx, audit
 * NET-09). This is the product/sales content surface: the markets airtuerk does
 * business in, the state legend, marker geometry, and the Supabase asset URLs.
 * Edit here (or later source from the CMS) without touching the d3 engine.
 *
 * Identifiers keep the names the engine already used, so the engine body is
 * unchanged apart from importing them from here.
 */

export type StateKey = "active" | "upcoming" | "office";

export interface Country {
  name: string;
  code: string;
  lng: number;
  lat: number;
  hub?: boolean;
  state: StateKey;
  office?: boolean;
  role?: string;
}

// ── Supabase storage asset URLs (apix/ bucket prefix) ──
export const SB_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/apix/`;
export const HUB_ICON = `${SB_BASE}map/at-favicon.svg`;
export const FLAG = (c: string) => `${SB_BASE}flags/${c}.png`;

// ── Marker / projection / label-layout geometry (NET-08: one typed home) ──
export const WIDTH = 1400;
export const HEIGHT = 720;
/** Max label-relaxation passes (the loop early-exits once converged, NET-04). */
export const ITER = 340;
export const HUB_R = 13;
export const OFFICE_R = 12;
export const DEFAULT_STATE: StateKey = "active";

// lucide.dev "building-2" path data (24×24) — drawn manually (not the lucide lib).
export const BUILDING2 = [
  "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",
  "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",
  "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",
  "M10 6h4",
  "M10 10h4",
  "M10 14h4",
  "M10 18h4",
];

export const STATE_META: Record<string, { label: string; color: string }> = {
  active: { label: "Doing business currently", color: "#0A82DF" },
  upcoming: { label: "Coming up next", color: "#F59E0B" },
  office: { label: "Our Offices", color: "#0557A6" },
};

// ── Market data — ported VERBATIM (hub Germany; 30 active, 6 upcoming, 3 offices) ──
export const COUNTRIES: Country[] = [
  { name: "GERMANY", code: "de", lng: 10.45, lat: 51.16, hub: true, state: "active" },
  { name: "TÜRKİYE", code: "tr", lng: 35.24, lat: 39.0, state: "active" },
  { name: "IRAQ", code: "iq", lng: 43.68, lat: 33.0, state: "active" },
  { name: "GABON", code: "ga", lng: 11.6, lat: -0.8, state: "active" },
  { name: "IRELAND", code: "ie", lng: -8.0, lat: 53.2, state: "active" },
  { name: "BELGIUM", code: "be", lng: 4.6, lat: 50.6, state: "active" },
  { name: "UKRAINE", code: "ua", lng: 31.5, lat: 49.0, state: "active" },
  { name: "LIBYA", code: "ly", lng: 17.5, lat: 27.0, state: "active" },
  { name: "UNITED KINGDOM", code: "gb", lng: -2.0, lat: 54.0, state: "active" },
  { name: "AZERBAIJAN", code: "az", lng: 47.7, lat: 40.3, state: "active" },
  { name: "PALESTINE", code: "ps", lng: 35.2, lat: 31.9, state: "active" },
  { name: "KENYA", code: "ke", lng: 37.9, lat: 0.2, state: "active" },
  { name: "PAKISTAN", code: "pk", lng: 69.3, lat: 30.4, state: "active" },
  { name: "UNITED ARAB EMIRATES", code: "ae", lng: 54.3, lat: 24.0, state: "active" },
  { name: "FRANCE", code: "fr", lng: 2.4, lat: 46.6, state: "active" },
  { name: "MOROCCO", code: "ma", lng: -6.5, lat: 31.8, state: "active" },
  { name: "SAUDI ARABIA", code: "sa", lng: 45.0, lat: 24.0, state: "active" },
  { name: "NEPAL", code: "np", lng: 84.1, lat: 28.4, state: "active" },
  { name: "UNITED STATES", code: "us", lng: -98.0, lat: 39.5, state: "active" },
  { name: "CHINA", code: "cn", lng: 104.0, lat: 35.5, state: "active" },
  { name: "HONG KONG", code: "hk", lng: 114.2, lat: 22.3, state: "active" },
  { name: "UZBEKISTAN", code: "uz", lng: 64.5, lat: 41.5, state: "active" },
  { name: "INDONESIA", code: "id", lng: 113.0, lat: -1.5, state: "active" },
  { name: "INDIA", code: "in", lng: 79.0, lat: 22.0, state: "active" },
  { name: "ALGERIA", code: "dz", lng: 2.6, lat: 28.0, state: "active" },
  { name: "QATAR", code: "qa", lng: 51.2, lat: 25.3, state: "active" },
  { name: "GREECE", code: "gr", lng: 22.0, lat: 39.2, state: "active" },
  { name: "SYRIA", code: "sy", lng: 38.5, lat: 35.0, state: "active" },
  { name: "KYRGYZSTAN", code: "kg", lng: 74.8, lat: 41.3, state: "active" },
  { name: "KAZAKHSTAN", code: "kz", lng: 67.0, lat: 48.0, state: "active" },
  { name: "TAJIKISTAN", code: "tj", lng: 71.3, lat: 38.9, state: "active" },
  { name: "SERBIA", code: "rs", lng: 21.0, lat: 44.2, state: "upcoming" },
  { name: "BULGARIA", code: "bg", lng: 25.5, lat: 42.7, state: "upcoming" },
  { name: "SOUTH AFRICA", code: "za", lng: 25.0, lat: -29.0, state: "upcoming" },
  { name: "EGYPT", code: "eg", lng: 30.5, lat: 26.5, state: "upcoming" },
  { name: "NIGERIA", code: "ng", lng: 8.0, lat: 9.0, state: "upcoming" },
  { name: "SENEGAL", code: "sn", lng: -14.5, lat: 14.5, state: "upcoming" },
  { name: "FRANKFURT", code: "de", lng: 8.68, lat: 50.11, state: "office", office: true, role: "HQ" },
  { name: "ISTANBUL", code: "tr", lng: 28.98, lat: 41.01, state: "office", office: true, role: "BedBank" },
  { name: "ANTALYA", code: "tr", lng: 30.71, lat: 36.89, state: "office", office: true, role: "Service Center" },
];

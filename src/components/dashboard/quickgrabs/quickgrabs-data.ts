import type { BrandSlug } from "@/lib/brand-types";

/**
 * Quick-Grabs cards + brand-tab list. HARDCODED for now (copy + targets are
 * placeholders) — a DB source replaces this in a later Buhara step. No DB touch.
 */

export interface QuickGrabCard {
  id: string;
  kind: "aktion" | "asset"; // tag label on the card
  title: string;
  sub: string;
  cta: string; // button text
  href: string; // target ("#" while unresolved)
  accentHex: string; // card gradient base (brand colour)
  imageUrl?: string; // optional right-half image; gradient placeholder if absent
}

export const QUICK_GRABS: QuickGrabCard[] = [
  { id: "sig",    kind: "aktion", title: "Create signature",
    sub: "Your email signature in 3 steps", cta: "Start",
    href: "#", accentHex: "#0A82DF" },
  { id: "deck",   kind: "asset",  title: "Latest master deck",
    sub: "airtuerk Service · Version 4 · DE / EN", cta: "View",
    href: "#", accentHex: "#1D9E75" },
  { id: "logos",  kind: "aktion", title: "Get logo packages",
    sub: "All brands · SVG, PNG & favicons", cta: "Open",
    href: "#", accentHex: "#BA7517" },
  { id: "farben", kind: "asset",  title: "Copy color palettes",
    sub: "Hex codes of all brands in one click", cta: "View",
    href: "#", accentHex: "#D85A30" },
];

export interface BrandTab {
  slug: BrandSlug; // also the NavIcon key (reuses shell/icons.tsx marks)
  label: string;
  description: string; // placeholder copy
  href: string;
}

// Only the 4 real single-page brands (BrandSlug). Labels mirror brand-data.ts
// marks; descriptions are placeholder one-liners.
export const BRAND_TABS: BrandTab[] = [
  { slug: "airtuerk-service",       label: "airtuerk Service",      description: "Flight consolidator & tech partner",        href: "/airtuerk-service" },
  { slug: "airtuerk-holidays",      label: "airtuerk Holidays",     description: "Package tours & tour operator brand",       href: "/airtuerk-holidays" },
  { slug: "atbeds",                 label: "atBeds",                description: "Hotel beds & allotments",                   href: "/atbeds" },
  { slug: "service-center-antalya", label: "Service Center Antalya", description: "Travel service & on-site support",          href: "/service-center-antalya" },
];

import type { BrandSlug } from "@/lib/brand-types";

/**
 * Quick-Grabs cards + brand-tab list. HARDCODED for now (copy + targets are
 * placeholders) — a DB source replaces this in a later Buhara step. No DB touch.
 */

export interface QuickGrabCard {
  id: string;
  title: string;
  sub: string;
  cta: string; // button text
  href: string; // target ("#" while unresolved)
  icon: "signature" | "atbeds" | "deck"; // badge glyph
  bgUrl: string; // full-bleed background image of the card
  artUrl: string; // right-side foreground composition (transparent PNG)
}

// HARDCODED for now. Images live under public/previews/quickgrabs/ (-bg =
// full-bleed background, -art = right-side foreground composition).
export const QUICK_GRABS: QuickGrabCard[] = [
  { id: "sig",   title: "Create signature",
    sub: "Your email signature in 3 steps", cta: "Start", href: "#",
    icon: "signature",
    bgUrl: "/previews/quickgrabs/sig-bg.png",   artUrl: "/previews/quickgrabs/sig-art.png" },
  { id: "brand", title: "Our new brand",
    sub: "Introducing ATBeds – Hotel IBE", cta: "Start", href: "#",
    icon: "atbeds",
    bgUrl: "/previews/quickgrabs/brand-bg.png", artUrl: "/previews/quickgrabs/brand-art.png" },
  { id: "deck",  title: "Latest master deck",
    sub: "airtuerk Service · Version 4 · DE / EN", cta: "Start", href: "#",
    icon: "deck",
    bgUrl: "/previews/quickgrabs/deck-bg.png",  artUrl: "/previews/quickgrabs/deck-art.png" },
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

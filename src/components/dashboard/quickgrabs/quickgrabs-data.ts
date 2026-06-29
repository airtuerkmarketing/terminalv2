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
    sub: "Your email signature in 3 steps", cta: "Start",
    href: "/airtuerk-service#email-signature",
    icon: "signature",
    bgUrl: "/previews/quickgrabs/sig-bg.png",   artUrl: "/previews/quickgrabs/sig-art.png" },
  { id: "brand", title: "Our new brand",
    sub: "Introducing ATBeds – Hotel IBE", cta: "Start",
    href: "/atbeds",
    icon: "atbeds",
    bgUrl: "/previews/quickgrabs/brand-bg.png", artUrl: "/previews/quickgrabs/brand-art.png" },
  { id: "deck",  title: "Latest master deck",
    sub: "airtuerk Service · Version 4 · DE / EN", cta: "Start",
    href: "/airtuerk-service#master-deck",
    icon: "deck",
    bgUrl: "/previews/quickgrabs/deck-bg.png",  artUrl: "/previews/quickgrabs/deck-art.png" },
];

/** Generic row for the Featured / Tools / Templates tabs — same visual as a
 *  BrandTab row, but the icon is a plain key (not a BrandSlug → not NavIcon). */
export interface QGRow {
  id: string;
  icon: string; // QGRowIcon key (lucide)
  label: string;
  description: string;
  href: string;
}

export const FEATURED_ROWS: QGRow[] = [
  { id: "deck",   icon: "presentation", label: "Master Deck",       description: "airtuerk Service · Version 4 · DE / EN", href: "/airtuerk-service#master-deck" },
  { id: "logos",  icon: "image",        label: "Logo packages",     description: "All brands · SVG, PNG & favicons",       href: "/airtuerk-service#logos" },
  { id: "colors", icon: "palette",      label: "Brand colors",      description: "Print & UX palettes, copy as hex",      href: "/airtuerk-service#colors" },
  { id: "docs",   icon: "files",        label: "Document Library",  description: "All shared documents in one place",     href: "/documents-library" },
];

export const TOOLS_ROWS: QGRow[] = [
  { id: "sig",      icon: "pen",       label: "Create email signature", description: "Your email signature in 3 steps", href: "/airtuerk-service#email-signature" },
  { id: "letter",   icon: "file-text", label: "Letterhead",             description: "Branded letter template",          href: "/airtuerk-service#letterhead" },
  { id: "linkedin", icon: "linkedin",  label: "LinkedIn banner",        description: "Branded banner for profiles",      href: "/airtuerk-service#linkedin-banner" },
];

export const TEMPLATES_ROWS: QGRow[] = [
  { id: "deck-tpl", icon: "presentation", label: "Master deck template", description: "Editable DE / EN deck base",        href: "/airtuerk-service#master-deck" },
  { id: "hub",      icon: "gallery",      label: "Presentation Hub",     description: "Browse & start from existing decks", href: "/presentation-hub" },
  { id: "doc-tpl",  icon: "files",        label: "Document templates",   description: "Reusable document layouts",          href: "/documents-library" },
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

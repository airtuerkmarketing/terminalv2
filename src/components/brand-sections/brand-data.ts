/**
 * Hardcoded, typed content for the 4 TSX brand pages. Every URL below is the
 * exact public-Storage asset verified in the live `blocks.content` JSON
 * (project zkydrymygjrscjbhusxp, 2026-06-24), rebuilt env-driven via the storage
 * helpers so it stays correct if the project URL changes — byte-identical to the
 * strings the old DB-block pipeline emitted.
 *
 * Sections with no content here (holidays/atBeds master-deck + letterhead) had
 * zero blocks in the DB and rendered the empty state — that behaviour is kept.
 */
import type {
  AssetBlockContent,
  DocumentListContent,
  LogoGridContent,
  LogoShowcaseContent,
} from "@/lib/blocks/types";
import type { BrandSlug } from "@/lib/brand-types";
import { documentUrl, imageUrl } from "@/lib/storage";

export interface LogosContent {
  heading: string;
  /** Anchor id — "logos" everywhere except Antalya, whose DB child slug is
   *  "logo" (singular). Must equal the DB child slug or the sidebar/redirect
   *  anchor breaks. */
  sectionId?: string;
  showcase: LogoShowcaseContent;
  grid?: LogoGridContent;
}

export const LOGOS: Record<BrandSlug, LogosContent> = {
  "airtuerk-service": {
    heading: "Logos",
    showcase: {
      mark: "airtuerk",
      assetUrl: imageUrl("brand-logos/airtuerk-service/airtuerk-Logo.svg"),
      packageLabel: "airtuerk Logo Package",
      packageSub: "Wordmark, fav icon & all formats",
      packageHref: documentUrl("logo-package/airtuerk-service/airtuerk-Logo.zip"),
    },
    grid: {
      display: "tiles",
      items: [
        { label: "Wordmark", assetUrl: imageUrl("brand-logos/airtuerk-service/airtuerk-Logo.svg") },
        { label: "Fav Icon", assetUrl: imageUrl("favicon/at-Favicon.svg") },
      ],
    },
  },
  "airtuerk-holidays": {
    heading: "Logos",
    showcase: {
      mark: "airtuerk Holidays",
      assetUrl: imageUrl("brand-logos/airtuerk-holidays/airtuerkholidays_Logo.svg"),
    },
    grid: {
      display: "tiles",
      items: [
        { label: "Wordmark", assetUrl: imageUrl("brand-logos/airtuerk-holidays/airtuerkholidays_Logo.svg") },
        { label: "Fav Icon", assetUrl: imageUrl("favicon/airtuerkholidays_Favicon.svg") },
      ],
    },
  },
  atbeds: {
    heading: "Logos",
    showcase: {
      mark: "atBeds",
      assetUrl: imageUrl("brand-logos/atbeds/atBeds_Logo.svg"),
      packageLabel: "atBeds Logo Package",
      packageSub: "Wordmark, fav icon & all formats",
      packageHref: documentUrl("logo-package/atbeds/atBeds-Logo.zip"),
    },
    grid: {
      display: "tiles",
      items: [
        { label: "Wordmark", assetUrl: imageUrl("brand-logos/atbeds/atBeds_Logo.svg") },
        { label: "Fav Icon", assetUrl: imageUrl("favicon/atBeds_Favicon.svg") },
      ],
    },
  },
  "service-center-antalya": {
    heading: "Logos",
    sectionId: "logo", // DB child slug is singular
    showcase: {
      mark: "airtuerk Service Center",
      // Storage folder stays `service-center` — Migration 0008 renamed the brand
      // slug to service-center-antalya but not the storage path (intentional).
      assetUrl: imageUrl("brand-logos/service-center/airtuerk-Service-Center-Logo.svg"),
      packageLabel: "Service Center Logo (SVG)",
      packageSub: "Wordmark, fav icon & all formats",
      packageHref: imageUrl("brand-logos/service-center/airtuerk-Service-Center-Logo.svg"),
    },
    // No logo grid for Antalya in the live DB (showcase only).
  },
};

const MASTER_DECK_AIRTUERK: DocumentListContent = {
  style: "preview_cards",
  groups: [
    {
      documents: [
        { href: documentUrl("master-deck/airtuerk-service/airtuerk_Master_DE.pdf"), lang: "DE", title: "airtuerk Master Deck (DE)", filetype: "pdf" },
        { href: documentUrl("master-deck/airtuerk-service/airtuerk_Master_EN.pdf"), lang: "EN", title: "airtuerk Master Deck (EN)", filetype: "pdf" },
      ],
    },
  ],
};

/** Master decks exist only for service + antalya (antalya reuses airtuerk's deck,
 *  exactly as the DB block content does). Holidays + atBeds → empty state. */
export const MASTER_DECK: Partial<Record<BrandSlug, DocumentListContent>> = {
  "airtuerk-service": MASTER_DECK_AIRTUERK,
  "service-center-antalya": MASTER_DECK_AIRTUERK,
};

const LETTERHEAD_BANK: DocumentListContent = {
  style: "list_rows",
  groups: [
    {
      documents: [
        { href: documentUrl("bank-info/Hauptkonto.zip"), title: "Letterheads — Hauptkonto" },
        { href: documentUrl("bank-info/Nebenkonto01.zip"), title: "Letterheads — Nebenkonto 01" },
      ],
    },
  ],
};

/** Letterheads exist only for service + antalya. Holidays + atBeds → empty state. */
export const LETTERHEAD: Partial<Record<BrandSlug, DocumentListContent>> = {
  "airtuerk-service": LETTERHEAD_BANK,
  "service-center-antalya": LETTERHEAD_BANK,
};

/** LinkedIn banner exists only for airtuerk-service. */
export const LINKEDIN_BANNER: Record<"airtuerk-service", AssetBlockContent> = {
  "airtuerk-service": {
    caption: "LinkedIn banner — 1584 × 396 px",
    assetUrl: imageUrl("misc/airtuerk_Banner.png"),
    downloads: [{ href: imageUrl("misc/airtuerk_Banner.png"), label: "Download Banner" }],
  },
};

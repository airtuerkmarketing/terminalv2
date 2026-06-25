import type { BrandSlug } from "@/lib/brand-types";
import { LETTERHEAD, LINKEDIN_BANNER, LOGOS, MASTER_DECK } from "./brand-data";
import { ColorsSection } from "./colors-section";
import { EmailSignatureSection } from "./email-signature-section";
import { LetterheadSection } from "./letterhead-section";
import { LinkedinBannerSection } from "./linkedin-banner-section";
import { LogosSection } from "./logos-section";
import { MasterDeckSection } from "./master-deck-section";

/**
 * Orchestrator for the TSX brand pages. The per-brand section order + headings
 * are the single source of truth for the TSX world and MUST match the DB child
 * pages' sort_order + slugs (verified 2026-06-24), so the in-page anchors and
 * sidebar sub-nav keep working:
 *
 *   service  : logos · colors · ux · master-deck · linkedin-banner · letterhead · email-signature
 *   holidays : logos · colors · master-deck · email-signature · letterhead
 *   atbeds   : logos · colors · ux · master-deck · email-signature · letterhead
 *   antalya  : logo  · colors · master-deck · letterhead · email-signature
 *
 * Rendered inside <article> (after the parent page's hero blocks) by page-view,
 * so the surrounding DOM is unchanged.
 */
export function BrandPage({ brand }: { brand: BrandSlug }) {
  switch (brand) {
    case "airtuerk-service":
      return (
        <>
          <LogosSection {...LOGOS[brand]} />
          <ColorsSection palette="logo" heading="Print Colors" />
          <ColorsSection palette="ux" heading="UX Colors" />
          <MasterDeckSection heading="Master Deck" content={MASTER_DECK[brand]} />
          <LinkedinBannerSection content={LINKEDIN_BANNER[brand]} />
          <LetterheadSection content={LETTERHEAD[brand]} />
          <EmailSignatureSection />
        </>
      );
    case "airtuerk-holidays":
      return (
        <>
          <LogosSection {...LOGOS[brand]} />
          <ColorsSection palette="logo" heading="Print Colors" />
          <MasterDeckSection heading="Master Deck" content={MASTER_DECK[brand]} />
          <EmailSignatureSection />
          <LetterheadSection content={LETTERHEAD[brand]} />
        </>
      );
    case "atbeds":
      return (
        <>
          <LogosSection {...LOGOS[brand]} />
          <ColorsSection palette="logo" heading="Print Colors" />
          <ColorsSection palette="ux" heading="UX Colors" />
          <MasterDeckSection heading="Master Deck" content={MASTER_DECK[brand]} />
          <EmailSignatureSection />
          <LetterheadSection content={LETTERHEAD[brand]} />
        </>
      );
    case "service-center-antalya":
      return (
        <>
          <LogosSection {...LOGOS[brand]} />
          <ColorsSection palette="logo" heading="Print Colors" />
          <MasterDeckSection heading="Master Deck" content={MASTER_DECK[brand]} />
          <LetterheadSection content={LETTERHEAD[brand]} />
          <EmailSignatureSection />
        </>
      );
  }
}

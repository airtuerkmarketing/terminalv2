/**
 * The 4 single-page brands that render through the TSX section pipeline
 * (D-064, feature: brand-sections TSX refactor) instead of the DB-block
 * aggregator. Deliberately narrow:
 *   • airtuerk-apix stays on the DB-block path (its children are hardcoded
 *     APIX tools rendered via getBrandSectionsAll — see page-view.tsx).
 *   • ibe-product-suite has its own product-brand-driven path.
 * Any brand NOT in this set falls through to the existing aggregator branch,
 * which is the safe fallback.
 */
export type BrandSlug =
  | "airtuerk-service"
  | "airtuerk-holidays"
  | "atbeds"
  | "service-center-antalya";

export const BRAND_TSX_SLUGS: ReadonlySet<BrandSlug> = new Set<BrandSlug>([
  "airtuerk-service",
  "airtuerk-holidays",
  "atbeds",
  "service-center-antalya",
]);

export function isBrandTsxSlug(slug: string): slug is BrandSlug {
  return BRAND_TSX_SLUGS.has(slug as BrandSlug);
}

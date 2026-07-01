import { Download } from "lucide-react";
import type { LogoGridContent, LogoShowcaseContent } from "@/lib/blocks/types";

/**
 * Logo & Fav Icon section — a designed, frontend-only layout (no longer composed
 * from the DB logo_showcase/logo_grid blocks, which stay as block types for the
 * DB path). Two-column anchor section: H2 left, content right. The content is two
 * equal logo tiles (Wordmark + Fav Icon, from grid.items) and, below, an assets
 * package block (from the showcase.package* fields).
 *
 * Per-tile: the whole tile is a download <a> for the logo asset. At rest the logo
 * sits at opacity 0.5 (the light tile background shows through → the intended
 * "light" look); on hover it goes full colour and a "Download" affordance fades
 * in top-right. Data (LOGOS in brand-data.ts) is unchanged.
 */
export function LogosSection({
  sectionId = "logos",
  heading,
  showcase,
  grid,
}: {
  sectionId?: string;
  heading: string;
  showcase: LogoShowcaseContent;
  grid?: LogoGridContent;
}) {
  // Tiles come from grid.items (Wordmark + Fav Icon). Brands without a grid
  // (Antalya) fall back to the single showcase asset so the column is never empty.
  const tiles =
    grid?.items?.length
      ? grid.items
      : showcase.assetUrl
        ? [{ label: showcase.mark ?? "Logo", assetUrl: showcase.assetUrl, href: undefined }]
        : [];

  return (
    <section id={sectionId} className="anchor-section anchor-section--two-col">
      <h2>{heading}</h2>
      <div className="logo-section-content">
        {tiles.length ? (
          <div className="logo-tiles">
            {tiles.map((it, i) => (
              <a
                key={i}
                className="logo-block"
                href={it.href ?? it.assetUrl}
                download
                aria-label={`Download ${it.label}`}
              >
                {it.assetUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static brand asset (SVG)
                  <img className="logo-block-img" src={it.assetUrl} alt={it.label} />
                ) : null}
                <span className="logo-block-dl" aria-hidden="true">
                  <span className="logo-block-dl-label">Download</span>
                  <Download className="logo-block-dl-icon" />
                </span>
              </a>
            ))}
          </div>
        ) : null}

        {showcase.packageLabel ? (
          <div className="logo-assets">
            <div className="logo-assets-title">{showcase.packageLabel}</div>
            {showcase.packageSub ? <p className="logo-assets-sub">{showcase.packageSub}</p> : null}
            {showcase.packageHref ? (
              <a className="logo-assets-btn" href={showcase.packageHref} download>
                Download Assets <Download aria-hidden />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

import { LogoGrid } from "@/components/blocks/logo-grid";
import { LogoShowcase } from "@/components/blocks/logo-showcase";
import type { LogoGridContent, LogoShowcaseContent } from "@/lib/blocks/types";

/**
 * Logo & Fav Icon section. Composes the existing logo_showcase + logo_grid
 * presentational blocks with hardcoded content. The `.page-blocks`/`.block`
 * wrappers and the two-column anchor section reproduce the DB-block DOM exactly,
 * so the grid layout, anchor id and styling are unchanged.
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
  return (
    <section id={sectionId} className="anchor-section anchor-section--two-col">
      <h2>{heading}</h2>
      <div className="page-blocks">
        <div className="block">
          <LogoShowcase content={showcase} />
        </div>
        {grid ? (
          <div className="block">
            <LogoGrid content={grid} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

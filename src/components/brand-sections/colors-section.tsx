import { ColorPalette } from "@/components/blocks/color-palette";
import { Description } from "@/components/blocks/description";
import {
  COLORS_LOGO_PALETTE,
  COLORS_REPRODUCTION_NOTE_HTML,
  COLORS_UX_PALETTE,
} from "@/lib/brand-palette";

/**
 * Colour section — one component for both the #colors (logo trio) and #ux
 * (UX/UI trio) anchors. The colour-reproduction note is shown under the logo
 * palette only (matching the DB, where the note block sits on #colors, not #ux).
 */
export function ColorsSection({
  palette,
  heading,
  sectionId,
  note = palette === "logo",
}: {
  palette: "logo" | "ux";
  heading: string;
  sectionId?: string;
  note?: boolean;
}) {
  const id = sectionId ?? (palette === "logo" ? "colors" : "ux");
  const content = palette === "logo" ? COLORS_LOGO_PALETTE : COLORS_UX_PALETTE;
  return (
    <section id={id} className="anchor-section anchor-section--two-col">
      <h2>{heading}</h2>
      <div className="page-blocks">
        <div className="block">
          <ColorPalette content={content} />
        </div>
        {note ? (
          <div className="block">
            <Description content={{ html: COLORS_REPRODUCTION_NOTE_HTML }} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

import { presentationKind, presentationKindLabel } from "@/lib/presentations-constants";

const NAT_W = 56;
const NAT_H = 72;

/**
 * Mini-document graphic with a colored format banner for non-image presentations
 * (PDF = Torch red, PPT/PPS/PPTX/PPSX = PowerPoint orange). Images never use this
 * — they show a real thumbnail. Tokens + `ph-typeicon` classes only. `scale`
 * shrinks the whole graphic from a fixed footprint (e.g. 0.56 in list rows).
 */
export function PresentationTypeIcon({
  extension,
  scale = 1,
}: {
  extension: string;
  scale?: number;
}) {
  const kind = presentationKind(extension); // pdf | ppt | image
  const inner = (
    <div className="ph-typeicon" data-kind={kind} aria-hidden="true">
      <div className="ph-typeicon-face">
        <span className="ph-typeicon-line" style={{ top: 14, right: 24 }} />
        <span className="ph-typeicon-line" style={{ top: 24 }} />
        <span className="ph-typeicon-line" style={{ top: 33 }} />
        <span className="ph-typeicon-line" style={{ top: 42, right: 22 }} />
      </div>
      <span className="ph-typeicon-banner">{presentationKindLabel(extension)}</span>
    </div>
  );

  if (scale === 1) return inner;

  // Reserve the scaled footprint so the row layout sizes the cell correctly.
  return (
    <div style={{ position: "relative", width: NAT_W * scale, height: NAT_H * scale }} aria-hidden="true">
      <div style={{ position: "absolute", top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {inner}
      </div>
    </div>
  );
}

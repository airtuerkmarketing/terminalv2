import type { TypographySpecimenContent } from "@/lib/blocks/types";

export function TypographySpecimen({ content }: { content: TypographySpecimenContent }) {
  return (
    <div className="type-specimen">
      {content.specimens.map((s, i) => (
        <div key={i} className="type-row">
          <div className="scale">{s.label}</div>
          <div
            className="sample"
            style={{ fontSize: s.sizePx ? `${s.sizePx}px` : undefined, fontWeight: s.weight }}
          >
            {s.sample}
          </div>
        </div>
      ))}
    </div>
  );
}

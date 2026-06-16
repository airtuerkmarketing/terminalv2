import type { ColorPaletteContent } from "@/lib/blocks/types";

// Panel background is the brand swatch itself (brand-content colour, set from
// data — this is the one legitimate place brand colours like torch red appear).
// Text colour auto-contrasts against the swatch.
function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
}

export function ColorPalette({ content }: { content: ColorPaletteContent }) {
  const strips = content.display === "strips";
  return (
    <div className={`palette${strips ? " palette--strips" : ""}`}>
      {content.colors.map((c, i) => (
        <div
          key={i}
          className="color-panel"
          style={{ background: c.hex, color: isLight(c.hex) ? "#222222" : "white" }}
        >
          <div>
            <div className="idx">{String(i + 1).padStart(2, "0")}</div>
            {c.role ? <div className="role">{c.role}</div> : null}
          </div>
          <div>
            <div className="cname">{c.name}</div>
            <div className="vals">
              <span>HEX {c.hex}</span>
              {c.rgb ? <span>RGB {c.rgb}</span> : null}
              {c.cmyk ? <span>CMYK {c.cmyk}</span> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import type { ContentShape } from "./types";

/**
 * Render-time content-shape heuristic (idea-3) — NO stored DB column to drift.
 * Cheap structural sniff so the card can pick quote / table / bullets / prose.
 */
export function inferContentShape(text: string): ContentShape {
  const t = (text ?? "").trim();
  if (!t) return "prose";
  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // table — a markdown pipe table: at least two rows carrying ≥2 pipes.
  const pipeRows = lines.filter((l) => (l.match(/\|/g)?.length ?? 0) >= 2);
  if (pipeRows.length >= 2) return "table";

  // bullets — majority of lines begin with a list marker.
  const bulletRows = lines.filter((l) => /^([-*•]|\d+[.)])\s+/.test(l));
  if (lines.length >= 2 && bulletRows.length >= Math.ceil(lines.length / 2)) return "bullets";

  // quote — short, statement-like (identity / mission lines).
  if (t.length <= 240 && lines.length <= 3) return "quote";

  return "prose";
}

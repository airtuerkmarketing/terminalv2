/**
 * Universal brand colour palettes — byte-identical across all 4 brand pages
 * (verified: only 2 distinct `color_palette` block-content values exist in the
 * entire DB, project zkydrymygjrscjbhusxp, 2026-06-24). They are structurally
 * global, so they live as constants, not per-brand data and not a DB table.
 *
 * If a brand ever needs a divergent palette, parametrise these constants per
 * brand here — do NOT reintroduce a DB lookup (the values change ~never).
 *
 * NOTE: `brands.primary_color` is a DIFFERENT thing (the brand-card accent,
 * which does vary per brand) — not these content swatches.
 */
import type { ColorPaletteContent } from "@/lib/blocks/types";

/** "Colors Logo" trio — shown at the #colors anchor. */
export const COLORS_LOGO_PALETTE: ColorPaletteContent = {
  display: "panels",
  colors: [
    { name: "Torch Red", hex: "#ED1C24", role: "PRIMARY", cmyk: "0·100·100·0" },
    { name: "Tiara Grey", hex: "#C7C6C5", role: "NEUTRAL", cmyk: "22·17·18·0" },
    { name: "Orient Blue", hex: "#17479E", role: "ACCENT", cmyk: "100·85·0·0" },
  ],
};

/** "Colors UX/UI" trio — shown at the #ux anchor. */
export const COLORS_UX_PALETTE: ColorPaletteContent = {
  display: "panels",
  colors: [
    { name: "Quantum Blue", hex: "#0A82DF", role: "PRIMARY", rgb: "10·130·223·1" },
    { name: "Jet Black", hex: "#222222", role: "NEUTRAL", cmyk: "75·68·67·0" },
    { name: "Ghost White", hex: "#F7F7F7", role: "SURFACE", cmyk: "2·1·1·0" },
  ],
};

/** Colour-reproduction caveat shown under the logo palette (#colors only). */
export const COLORS_REPRODUCTION_NOTE_HTML =
  "<p>Please note: Various factors can affect colour reproduction across screens, materials and printing processes. Always use the official HEX values for digital and the CMYK values for print, and request a printed proof before any production run.</p>";

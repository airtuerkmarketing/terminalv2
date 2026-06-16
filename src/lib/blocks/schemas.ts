/**
 * Zod schemas for each block type's `content` JSON (ARCHITECTURE.md §6).
 * The BlockRenderer validates every block against these before rendering, so a
 * malformed or unknown block degrades gracefully instead of crashing the page.
 */
import { z } from "zod";
import type { BlockType } from "./types";

const navTarget = z.object({ label: z.string(), href: z.string() });

const pageHero = z.object({
  number: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
});

const description = z.object({ html: z.string() });

const pageNav = z.object({
  prev: navTarget.optional(),
  next: navTarget.optional(),
});

const colorEntry = z.object({
  name: z.string(),
  hex: z.string(),
  role: z.string().optional(),
  rgb: z.string().optional(),
  cmyk: z.string().optional(),
});
const colorPalette = z.object({
  display: z.enum(["panels", "strips"]).optional(),
  colors: z.array(colorEntry),
});

const typographySpecimen = z.object({
  specimens: z.array(
    z.object({
      label: z.string(),
      sample: z.string(),
      sizePx: z.number().optional(),
      weight: z.number().optional(),
      note: z.string().optional(),
    })
  ),
});

const typeScaleTable = z.object({
  rows: z.array(
    z.object({
      token: z.string(),
      sizePx: z.number(),
      weight: z.number().optional(),
      lineHeight: z.string().optional(),
      tracking: z.string().optional(),
    })
  ),
});

const logoShowcase = z.object({
  mark: z.string().optional(),
  assetUrl: z.string().optional(),
  downloadHref: z.string().optional(),
  packageLabel: z.string().optional(),
  packageSub: z.string().optional(),
  packageHref: z.string().optional(),
});

const logoGrid = z.object({
  display: z.enum(["circles", "tiles"]).optional(),
  items: z.array(
    z.object({
      label: z.string(),
      mark: z.string().optional(),
      assetUrl: z.string().optional(),
      href: z.string().optional(),
    })
  ),
});

const assetDownload = z.object({ label: z.string(), href: z.string() });
const assetBlock = z.object({
  title: z.string().optional(),
  assetUrl: z.string().optional(),
  caption: z.string().optional(),
  downloads: z.array(assetDownload).optional(),
});

const assetGrid = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      assetUrl: z.string().optional(),
      kind: z.string().optional(),
      meta: z.string().optional(),
      href: z.string().optional(),
    })
  ),
});

const documentItem = z.object({
  title: z.string(),
  filetype: z.enum(["pdf", "word"]).optional(),
  lang: z.string().optional(),
  href: z.string().optional(),
  meta: z.string().optional(),
});
const documentList = z.object({
  style: z.enum(["list_rows", "preview_cards", "image_outline_button"]).optional(),
  groups: z.array(z.object({ title: z.string().optional(), documents: z.array(documentItem) })),
});

const dutyCard = z.object({
  title: z.string(),
  person: z.string().optional(),
  role: z.string().optional(),
  items: z.array(z.string()).optional(),
});
const dutyGrid = z.object({ cards: z.array(dutyCard) });

const productShowcase = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      tagline: z.string().optional(),
      href: z.string().optional(),
      color: z.string().optional(),
    })
  ),
});

const rawHtml = z.object({ html: z.string() });

/** type string → zod schema. `satisfies` enforces one schema per BlockType. */
export const blockSchemas = {
  page_hero: pageHero,
  description,
  page_nav: pageNav,
  color_palette: colorPalette,
  typography_specimen: typographySpecimen,
  type_scale_table: typeScaleTable,
  logo_showcase: logoShowcase,
  logo_grid: logoGrid,
  asset_block: assetBlock,
  asset_grid: assetGrid,
  document_list: documentList,
  duty_card: dutyCard,
  duty_grid: dutyGrid,
  product_showcase: productShowcase,
  raw_html: rawHtml,
} satisfies Record<BlockType, z.ZodType>;

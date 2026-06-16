/**
 * Block type system for terminalv2 (ARCHITECTURE.md §6).
 *
 * 15 block types + the raw_html escape hatch. Each block row from the `blocks`
 * table carries a shared envelope (type, position, layout, heading, anchor) and
 * a type-specific `content` JSON validated by schemas.ts.
 *
 * Some content shapes are under-specified in ARCHITECTURE §6; the fields below
 * are the canonical contract the schemas, components and (Phase 5) admin forms
 * share.
 */

export type BlockLayout = "full" | "two-column";

export type BlockType =
  | "page_hero"
  | "description"
  | "page_nav"
  | "color_palette"
  | "typography_specimen"
  | "type_scale_table"
  | "logo_showcase"
  | "logo_grid"
  | "asset_block"
  | "asset_grid"
  | "document_list"
  | "duty_card"
  | "duty_grid"
  | "product_showcase"
  | "raw_html";

/** A row from the `blocks` table (content still unvalidated). */
export interface BlockRow {
  id: string;
  type: string;
  position: number;
  layout: BlockLayout;
  heading: string | null;
  anchor: string | null;
  content: unknown;
}

// ── Structure blocks ──
export interface PageHeroContent {
  number?: string;
  title: string;
  subtitle?: string;
}
export interface DescriptionContent {
  html: string;
}
export interface NavTarget {
  label: string;
  href: string;
}
export interface PageNavContent {
  prev?: NavTarget;
  next?: NavTarget;
}

// ── Brand blocks ──
export interface ColorEntry {
  name: string;
  hex: string;
  role?: string;
  rgb?: string;
  cmyk?: string;
}
export interface ColorPaletteContent {
  display?: "panels" | "strips";
  colors: ColorEntry[];
}
export interface TypeSpecimen {
  label: string;
  sample: string;
  sizePx?: number;
  weight?: number;
  note?: string;
}
export interface TypographySpecimenContent {
  specimens: TypeSpecimen[];
}
export interface TypeScaleRow {
  token: string;
  sizePx: number;
  weight?: number;
  lineHeight?: string;
  tracking?: string;
}
export interface TypeScaleTableContent {
  rows: TypeScaleRow[];
}
export interface LogoShowcaseContent {
  mark?: string;
  assetUrl?: string;
  downloadHref?: string;
  packageLabel?: string;
  packageSub?: string;
  packageHref?: string;
}
export interface LogoGridItem {
  label: string;
  mark?: string;
  assetUrl?: string;
  href?: string;
}
export interface LogoGridContent {
  display?: "circles" | "tiles";
  items: LogoGridItem[];
}

// ── Content blocks ──
export interface AssetDownload {
  label: string;
  href: string;
}
export interface AssetBlockContent {
  title?: string;
  assetUrl?: string;
  caption?: string;
  downloads?: AssetDownload[];
}
export interface AssetGridItem {
  title: string;
  assetUrl?: string;
  kind?: string;
  meta?: string;
  href?: string;
}
export interface AssetGridContent {
  items: AssetGridItem[];
}
export type DocumentStyle = "list_rows" | "preview_cards" | "image_outline_button";
export interface DocumentItem {
  title: string;
  filetype?: "pdf" | "word";
  lang?: string;
  href?: string;
  meta?: string;
}
export interface DocumentGroup {
  title?: string;
  documents: DocumentItem[];
}
export interface DocumentListContent {
  style?: DocumentStyle;
  groups: DocumentGroup[];
}
export interface DutyCardContent {
  title: string;
  person?: string;
  role?: string;
  items?: string[];
}
export interface DutyGridContent {
  cards: DutyCardContent[];
}
export interface ProductShowcaseItem {
  name: string;
  tagline?: string;
  href?: string;
  color?: string;
}
export interface ProductShowcaseContent {
  products: ProductShowcaseItem[];
}

// ── Escape hatch ──
export interface RawHtmlContent {
  html: string;
}

import type { ComponentType } from "react";
import type { BlockType } from "./types";

import { PageHero } from "@/components/blocks/page-hero";
import { Description } from "@/components/blocks/description";
import { PageNav } from "@/components/blocks/page-nav";
import { ColorPalette } from "@/components/blocks/color-palette";
import { TypographySpecimen } from "@/components/blocks/typography-specimen";
import { TypeScaleTable } from "@/components/blocks/type-scale-table";
import { LogoShowcase } from "@/components/blocks/logo-showcase";
import { LogoGrid } from "@/components/blocks/logo-grid";
import { AssetBlock } from "@/components/blocks/asset-block";
import { AssetGrid } from "@/components/blocks/asset-grid";
import { DocumentList } from "@/components/blocks/document-list";
import { DutyCard } from "@/components/blocks/duty-card";
import { DutyGrid } from "@/components/blocks/duty-grid";
import { ProductShowcase } from "@/components/blocks/product-showcase";
import { RawHtml } from "@/components/blocks/raw-html";

/**
 * Maps each block type string to its renderer. Content is validated by the
 * matching zod schema (schemas.ts) before the component receives it, so the
 * validated shape always matches the component's expected props.
 */
export const blockRegistry: Record<BlockType, ComponentType<{ content: any }>> = {
  page_hero: PageHero,
  description: Description,
  page_nav: PageNav,
  color_palette: ColorPalette,
  typography_specimen: TypographySpecimen,
  type_scale_table: TypeScaleTable,
  logo_showcase: LogoShowcase,
  logo_grid: LogoGrid,
  asset_block: AssetBlock,
  asset_grid: AssetGrid,
  document_list: DocumentList,
  duty_card: DutyCard,
  duty_grid: DutyGrid,
  product_showcase: ProductShowcase,
  raw_html: RawHtml,
};

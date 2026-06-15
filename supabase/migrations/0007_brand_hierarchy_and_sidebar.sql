-- ============================================================================
-- terminalv2 — Brand hierarchy + sidebar visibility
-- Migration: 0007_brand_hierarchy_and_sidebar.sql
-- Description: Adds parent_id to brands (for IBE Product Suite → 6 sub-brands)
--              and hidden_in_sidebar to pages (for Playground, airLounge, etc.)
-- Phase: 3.5 (post-design-iteration restructure)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. brands.parent_id — for product-suite hierarchy
-- ----------------------------------------------------------------------------

ALTER TABLE brands
  ADD COLUMN parent_id uuid REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX brands_parent_id_idx ON brands (parent_id);

COMMENT ON COLUMN brands.parent_id IS
  'Parent brand for sub-products. NULL = top-level brand. IBE Product Suite is parent for multicheck, cockpit, myTransfer, myBooking, rentalCar, myStats, airLounge.';

-- ----------------------------------------------------------------------------
-- 2. pages.hidden_in_sidebar — for pages that exist but should not appear in main nav
-- ----------------------------------------------------------------------------

ALTER TABLE pages
  ADD COLUMN hidden_in_sidebar boolean NOT NULL DEFAULT false;

CREATE INDEX pages_hidden_in_sidebar_idx ON pages (hidden_in_sidebar) WHERE hidden_in_sidebar = false;

COMMENT ON COLUMN pages.hidden_in_sidebar IS
  'When true, page exists and URL is reachable but does not appear in the main sidebar. Used for: Playground (until game ships), airLounge (kept in DB for legacy URLs), reserved internal pages.';

-- ----------------------------------------------------------------------------
-- 3. brands.is_product — distinguishes a "real brand" from a "product within a suite"
-- ----------------------------------------------------------------------------

ALTER TABLE brands
  ADD COLUMN is_product boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN brands.is_product IS
  'When true, this brand is a product within a parent brand suite (e.g. multicheck under IBE Product Suite). Affects sidebar rendering and brand-card vs product-card UI.';

-- ----------------------------------------------------------------------------
-- 4. brands.sidebar_section — which sidebar section the brand appears in
-- ----------------------------------------------------------------------------

ALTER TABLE brands
  ADD COLUMN sidebar_section text NOT NULL DEFAULT 'brands'
  CHECK (sidebar_section IN ('brands', 'resources', 'hidden'));

COMMENT ON COLUMN brands.sidebar_section IS
  '"brands" = main brands & products section. "resources" = Asset Library, Document Library, Team, Presentation Hub. "hidden" = exists but not in sidebar.';

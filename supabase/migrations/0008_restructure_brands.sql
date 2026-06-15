-- ============================================================================
-- terminalv2 — Brand restructure (Phase 3.5)
-- Migration: 0008_restructure_brands.sql
-- Description:
--   1. Renames "service-center" slug to "service-center-antalya"
--   2. Adds 6 new IBE product sub-brands (multicheck, cockpit, myTransfer,
--      myBooking, rentalCar, myStats) with parent_id = IBE Product Suite
--   3. Adds airLounge as 7th IBE product but hidden_in_sidebar
--   4. Marks Presentation Hub as resources section
--   5. Updates sort_order to match final sidebar
--   6. Removes 4 standalone pages (budget26, ops, image-grid, focus-mgzn)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename service-center → service-center-antalya
-- ----------------------------------------------------------------------------

-- Update brand slug + name
UPDATE brands
SET slug = 'service-center-antalya',
    name = 'Service Center Antalya',
    short_name = 'Service Center Antalya'
WHERE slug = 'service-center';

-- Update parent page slug + full_path
UPDATE pages
SET slug = 'service-center-antalya',
    full_path = '/service-center-antalya',
    title = 'Service Center Antalya'
WHERE full_path = '/service-center';

-- Update child pages full_path (slug stays the same)
UPDATE pages
SET full_path = REPLACE(full_path, '/service-center/', '/service-center-antalya/')
WHERE full_path LIKE '/service-center/%';

-- ----------------------------------------------------------------------------
-- 2. Mark Presentation Hub as a "resources" section item (not a brand)
-- ----------------------------------------------------------------------------

UPDATE brands
SET sidebar_section = 'resources',
    sort_order = 200
WHERE slug = 'presentation-hub';

-- Presentation Hub becomes hardcoded with sections (like Document Library)
UPDATE pages
SET rendering_mode = 'hardcoded',
    component_key = 'presentation-hub'
WHERE full_path = '/presentation-hub';

-- ----------------------------------------------------------------------------
-- 3. Update top-level brand sort_order to match the new sidebar
-- ----------------------------------------------------------------------------

UPDATE brands SET sort_order = 10  WHERE slug = 'airtuerk-service';
UPDATE brands SET sort_order = 20  WHERE slug = 'airtuerk-holidays';
UPDATE brands SET sort_order = 30  WHERE slug = 'atbeds';
UPDATE brands SET sort_order = 40  WHERE slug = 'service-center-antalya';
UPDATE brands SET sort_order = 50  WHERE slug = 'ibe-product-suite';
UPDATE brands SET sort_order = 60  WHERE slug = 'internal-branding';
UPDATE brands SET sort_order = 70  WHERE slug = 'airtuerk-apix';
-- presentation-hub already moved to 200 above

-- ----------------------------------------------------------------------------
-- 4. Add 7 IBE product sub-brands (linked to IBE Product Suite as parent)
--    These are NEW brand rows that the existing 7 IBE sub-PAGES will be
--    re-associated with in 0009. They get their own colors and metadata.
-- ----------------------------------------------------------------------------

WITH ibe_parent AS (
  SELECT id FROM brands WHERE slug = 'ibe-product-suite'
)
INSERT INTO brands (slug, name, short_name, tagline, description, primary_color, sort_order, parent_id, is_product, sidebar_section)
SELECT
  data.slug, data.name, data.short_name, data.tagline, data.description,
  data.primary_color, data.sort_order, ibe_parent.id,
  true,           -- is_product
  'hidden'        -- not in top-level sidebar (they appear nested under IBE)
FROM ibe_parent,
(VALUES
  ('multicheck', 'multicheck', 'multicheck',
   'Multi-airline fare comparison.',
   'B2B fare comparison engine across multiple airlines and content sources.',
   '#6B46C1', 51),

  ('cockpit', 'cockpit', 'cockpit',
   'The agent workspace.',
   'The booking workspace for travel agents — Quantum Blue branded.',
   '#0A82DF', 52),

  ('mytransfer', 'myTransfer', 'myTransfer',
   'Ground transportation.',
   'Airport transfers and ground transportation services integrated into the booking flow.',
   '#2DBE60', 53),

  ('mybooking', 'myBooking', 'myBooking',
   'Direct booking platform.',
   'Direct-to-consumer booking site for selected destinations.',
   '#E8B900', 54),

  ('rentalcar', 'rentalCar', 'rentalCar',
   'Car rental aggregator.',
   'Global car rental aggregator integrated into the airtuerk booking flow.',
   '#00868C', 55),

  ('mystats', 'myStats', 'myStats',
   'Booking analytics.',
   'Booking analytics and BI dashboards for travel partners.',
   '#C0392B', 56),

  ('airlounge', 'airLounge', 'airLounge',
   'Lounge access.',
   'Airport lounge access aggregator. Legacy product, kept for reference.',
   '#8B5A35', 57)
) AS data(slug, name, short_name, tagline, description, primary_color, sort_order);

-- ----------------------------------------------------------------------------
-- 5. Re-link the existing IBE sub-PAGES to their new product brand_id
--    (Currently they have brand_id = ibe-product-suite. Now they get their own brand.)
-- ----------------------------------------------------------------------------

UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'multicheck')
  WHERE full_path = '/ibe-product-suite/multicheck';
UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'cockpit')
  WHERE full_path = '/ibe-product-suite/cockpit';
UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'mytransfer')
  WHERE full_path = '/ibe-product-suite/mytransfer';
UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'mybooking')
  WHERE full_path = '/ibe-product-suite/mybooking';
UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'rentalcar')
  WHERE full_path = '/ibe-product-suite/rentalcar';
UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'mystats')
  WHERE full_path = '/ibe-product-suite/mystats';
UPDATE pages SET brand_id = (SELECT id FROM brands WHERE slug = 'airlounge')
  WHERE full_path = '/ibe-product-suite/airlounge';

-- airLounge sub-page hidden from sidebar
UPDATE pages
SET hidden_in_sidebar = true
WHERE full_path = '/ibe-product-suite/airlounge';

-- ----------------------------------------------------------------------------
-- 6. Hide Playground from sidebar (kept as URL — game coming later)
-- ----------------------------------------------------------------------------

UPDATE pages
SET hidden_in_sidebar = true
WHERE full_path = '/playground';

-- ----------------------------------------------------------------------------
-- 7. Remove 4 standalone pages (budget26, ops, image-grid, focus-mgzn)
--    Their blocks cascade-delete because blocks.page_id has ON DELETE CASCADE.
-- ----------------------------------------------------------------------------

DELETE FROM pages
WHERE full_path IN ('/budget26', '/ops', '/image-grid', '/focus-mgzn');

-- ----------------------------------------------------------------------------
-- 8. Add atBeds-required sub-pages (atBeds uses the airtuerk Service schablone)
--    Schema: Logos, Colors, UX, Master Deck, Email Signature, Letterhead — already exists in 0005.
--    Just confirm structure with a sanity check below.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Sanity check: expected page count after this migration
-- 56 (initial) - 4 (deleted standalone) + 0 (no new pages added — IBE sub-brands
-- inherit existing IBE sub-pages) = 52 pages total
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  page_count int;
  brand_count int;
BEGIN
  SELECT count(*) INTO page_count FROM pages;
  SELECT count(*) INTO brand_count FROM brands;

  IF page_count <> 52 THEN
    RAISE EXCEPTION 'Expected 52 pages after restructure, found %', page_count;
  END IF;

  IF brand_count <> 15 THEN  -- 8 original + 7 IBE products
    RAISE EXCEPTION 'Expected 15 brands after restructure (8 original + 7 IBE products), found %', brand_count;
  END IF;
END $$;

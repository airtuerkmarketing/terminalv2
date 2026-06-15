-- ============================================================================
-- terminalv2 — Seed pages
-- Migration: 0005_seed_pages.sql
-- Description: Seeds all 56 pages — 13 top-level + 39 sub-pages + 4 standalone.
--              All pages start as 'draft'. og_asset_id is NULL until backfill.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Top-level pages (13)
-- ----------------------------------------------------------------------------

INSERT INTO pages (slug, full_path, number, sort_order, title, rendering_mode, component_key, status, brand_id)
VALUES
  -- 01 Landing
  ('',                  '/',                  1,  10,  'Brand Universe',     'blocks',    NULL,                  'draft', NULL),

  -- 02-08 Brands
  ('airtuerk-service',  '/airtuerk-service',  2,  20,  'airtuerk Service',   'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'airtuerk-service')),
  ('airtuerk-holidays', '/airtuerk-holidays', 3,  30,  'airtuerk Holidays',  'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'airtuerk-holidays')),
  ('atbeds',            '/atbeds',            4,  40,  'atBeds',             'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'atbeds')),
  ('service-center',    '/service-center',    5,  50,  'Service Center',     'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'service-center')),
  ('ibe-product-suite', '/ibe-product-suite', 6,  60,  'IBE Product Suite',  'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'ibe-product-suite')),
  ('internal-branding', '/internal-branding', 7,  70,  'Internal Branding',  'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'internal-branding')),
  ('airtuerk-apix',     '/airtuerk-apix',     8,  80,  'airtuerk APIX',      'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'airtuerk-apix')),

  -- 09-13 Utilities
  ('presentation-hub',  '/presentation-hub',  9,  90,  'Presentation Hub',   'blocks',    NULL,                  'draft', (SELECT id FROM brands WHERE slug = 'presentation-hub')),
  ('asset-library',     '/asset-library',     10, 100, 'Asset Library',      'hardcoded', 'asset-library',       'draft', NULL),
  ('documents-library', '/documents-library', 11, 110, 'Documents Library',  'hardcoded', 'document-library',    'draft', NULL),
  ('team',              '/team',              12, 120, 'Team',               'hardcoded', 'team-directory',      'draft', NULL),
  ('playground',        '/playground',        13, 130, 'Playground',         'blocks',    NULL,                  'draft', NULL);

-- ----------------------------------------------------------------------------
-- Sub-pages of airtuerk Service (6)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'logos',          '/airtuerk-service/logos',          10, 'Logos',           'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-service'
UNION ALL
SELECT id, brand_id, 'colors',         '/airtuerk-service/colors',         20, 'Colors',          'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-service'
UNION ALL
SELECT id, brand_id, 'ux',             '/airtuerk-service/ux',             30, 'UX',              'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-service'
UNION ALL
SELECT id, brand_id, 'master-deck',    '/airtuerk-service/master-deck',    40, 'Master Deck',     'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-service'
UNION ALL
SELECT id, brand_id, 'email-signature','/airtuerk-service/email-signature',50, 'Email Signature', 'hardcoded', 'email-signature',  'draft' FROM pages WHERE full_path = '/airtuerk-service'
UNION ALL
SELECT id, brand_id, 'letterhead',     '/airtuerk-service/letterhead',     60, 'Letterhead',      'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-service';

-- ----------------------------------------------------------------------------
-- Sub-pages of airtuerk Holidays (5)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'logos',          '/airtuerk-holidays/logos',          10, 'Logos',           'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-holidays'
UNION ALL
SELECT id, brand_id, 'colors',         '/airtuerk-holidays/colors',         20, 'Colors',          'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-holidays'
UNION ALL
SELECT id, brand_id, 'master-deck',    '/airtuerk-holidays/master-deck',    30, 'Master Deck',     'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-holidays'
UNION ALL
SELECT id, brand_id, 'email-signature','/airtuerk-holidays/email-signature',40, 'Email Signature', 'hardcoded', 'email-signature',  'draft' FROM pages WHERE full_path = '/airtuerk-holidays'
UNION ALL
SELECT id, brand_id, 'letterhead',     '/airtuerk-holidays/letterhead',     50, 'Letterhead',      'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/airtuerk-holidays';

-- ----------------------------------------------------------------------------
-- Sub-pages of atBeds (6)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'logos',          '/atbeds/logos',          10, 'Logos',           'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/atbeds'
UNION ALL
SELECT id, brand_id, 'colors',         '/atbeds/colors',         20, 'Colors',          'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/atbeds'
UNION ALL
SELECT id, brand_id, 'ux',             '/atbeds/ux',             30, 'UX',              'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/atbeds'
UNION ALL
SELECT id, brand_id, 'master-deck',    '/atbeds/master-deck',    40, 'Master Deck',     'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/atbeds'
UNION ALL
SELECT id, brand_id, 'email-signature','/atbeds/email-signature',50, 'Email Signature', 'hardcoded', 'email-signature',  'draft' FROM pages WHERE full_path = '/atbeds'
UNION ALL
SELECT id, brand_id, 'letterhead',     '/atbeds/letterhead',     60, 'Letterhead',      'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/atbeds';

-- ----------------------------------------------------------------------------
-- Sub-pages of Service Center (5)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'logo',           '/service-center/logo',           10, 'Logo',            'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/service-center'
UNION ALL
SELECT id, brand_id, 'colors',         '/service-center/colors',         20, 'Colors',          'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/service-center'
UNION ALL
SELECT id, brand_id, 'master-deck',    '/service-center/master-deck',    30, 'Master Deck',     'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/service-center'
UNION ALL
SELECT id, brand_id, 'email-signature','/service-center/email-signature',40, 'Email Signature', 'hardcoded', 'email-signature',  'draft' FROM pages WHERE full_path = '/service-center'
UNION ALL
SELECT id, brand_id, 'letterhead',     '/service-center/letterhead',     50, 'Letterhead',      'blocks',    NULL,               'draft' FROM pages WHERE full_path = '/service-center';

-- ----------------------------------------------------------------------------
-- Sub-pages of IBE Product Suite (7)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'multicheck', '/ibe-product-suite/multicheck', 10, 'multicheck', 'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite'
UNION ALL
SELECT id, brand_id, 'rentalcar',  '/ibe-product-suite/rentalcar',  20, 'rentalCar',  'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite'
UNION ALL
SELECT id, brand_id, 'mybooking',  '/ibe-product-suite/mybooking',  30, 'myBooking',  'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite'
UNION ALL
SELECT id, brand_id, 'mystats',    '/ibe-product-suite/mystats',    40, 'myStats',    'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite'
UNION ALL
SELECT id, brand_id, 'mytransfer', '/ibe-product-suite/mytransfer', 50, 'myTransfer', 'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite'
UNION ALL
SELECT id, brand_id, 'airlounge',  '/ibe-product-suite/airlounge',  60, 'airLounge',  'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite'
UNION ALL
SELECT id, brand_id, 'cockpit',    '/ibe-product-suite/cockpit',    70, 'Cockpit',    'blocks', NULL, 'draft' FROM pages WHERE full_path = '/ibe-product-suite';

-- ----------------------------------------------------------------------------
-- Sub-pages of Internal Branding (2)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'applied-identity', '/internal-branding/applied-identity', 10, 'Applied Identity', 'blocks',    NULL,                      'draft' FROM pages WHERE full_path = '/internal-branding'
UNION ALL
SELECT id, brand_id, 'configurator',     '/internal-branding/configurator',     20, 'Configurator',     'hardcoded', 'identity-configurator',   'draft' FROM pages WHERE full_path = '/internal-branding';

-- ----------------------------------------------------------------------------
-- Sub-pages of airtuerk APIX (8)
-- ----------------------------------------------------------------------------

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'presentation',   '/airtuerk-apix/presentation',   10, 'Presentation',  'blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'workflow',       '/airtuerk-apix/workflow',       20, 'Workflow',      'hardcoded', 'apix-workflow',  'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'global-network', '/airtuerk-apix/global-network', 30, 'Global Network','blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'partner',        '/airtuerk-apix/partner',        40, 'Partner',       'blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'agreement',      '/airtuerk-apix/agreement',      50, 'Agreement',     'blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'documentation',  '/airtuerk-apix/documentation',  60, 'Documentation', 'blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'nda',            '/airtuerk-apix/nda',            70, 'NDA',           'blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix'
UNION ALL
SELECT id, brand_id, 'master-deck',    '/airtuerk-apix/master-deck',    80, 'Master Deck',   'blocks',    NULL,             'draft' FROM pages WHERE full_path = '/airtuerk-apix';

-- ----------------------------------------------------------------------------
-- Standalone pages (4) — no parent, no number
-- ----------------------------------------------------------------------------

INSERT INTO pages (slug, full_path, sort_order, title, rendering_mode, component_key, status)
VALUES
  ('budget26',   '/budget26',   1000, 'Budget 2026',     'blocks', NULL, 'draft'),
  ('ops',        '/ops',        1010, 'Operations',      'blocks', NULL, 'draft'),
  ('image-grid', '/image-grid', 1020, 'Image Grid',      'blocks', NULL, 'draft'),
  ('focus-mgzn', '/focus-mgzn', 1030, 'Focus Magazine',  'blocks', NULL, 'draft');

-- ----------------------------------------------------------------------------
-- Sanity check: count should be 56 (13 top-level + 39 sub-pages + 4 standalone)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  page_count int;
BEGIN
  SELECT count(*) INTO page_count FROM pages;
  IF page_count <> 56 THEN
    RAISE EXCEPTION 'Expected 56 pages, found %', page_count;
  END IF;
END $$;

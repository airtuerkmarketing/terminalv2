-- ============================================================================
-- terminalv2 — Seed brands
-- Migration: 0004_seed_brands.sql
-- Description: Seeds the 8 airtuerk brands. logo_asset_id is NULL until
--              Phase 2 asset upload backfills it.
-- ============================================================================

INSERT INTO brands (slug, name, short_name, tagline, description, primary_color, sort_order)
VALUES
  ('airtuerk-service',     'airtuerk Service GmbH', 'airtuerk Service',
   'Transforming ideas into reality.',
   'The brand home of airtuerk Service GmbH. Logos, letterheads, presentation templates, and email signatures for the flight consolidation business.',
   '#ED1C24', 10),

  ('airtuerk-holidays',    'airtuerk Holidays',     'airtuerk Holidays',
   'Vacations beyond expectations.',
   'Leisure and package travel brand.',
   '#17479E', 20),

  ('atbeds',               'atBeds',                'atBeds',
   'Smart rooms, simple stays.',
   'Accommodation and B2B hotel inventory brand.',
   '#0A82DF', 30),

  ('service-center',       'Service Center Antalya','Service Center',
   '24/7 support, ground and air.',
   'Operations and customer service hub in Antalya.',
   '#222222', 40),

  ('ibe-product-suite',    'IBE Product Suite',     'IBE Product Suite',
   'The technology behind airtuerk.',
   'Internal booking engine product family: multicheck, rentalCar, myBooking, myStats, myTransfer, airLounge, Cockpit.',
   '#17479E', 50),

  ('internal-branding',    'Internal Branding',     'Internal Branding',
   'How airtuerk shows up internally.',
   'Applied identity and configurator tooling for internal communications.',
   '#222222', 60),

  ('airtuerk-apix',        'airtuerk APIX',         'airtuerk APIX',
   'One API for global flight content.',
   'The API platform powering airtuerk partners — NDC, scheduled, charter, payment, and B2B/B2C tooling.',
   '#0A82DF', 70),

  ('presentation-hub',     'Presentation Hub',      'Presentation Hub',
   'All decks, one place.',
   'Internal repository for airtuerk presentation materials.',
   '#222222', 80);

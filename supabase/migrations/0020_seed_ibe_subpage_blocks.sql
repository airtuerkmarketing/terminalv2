-- 0020_seed_ibe_subpage_blocks.sql
-- Phase 4 — seed the 7 IBE product sub-pages with a description + logo_showcase
-- block each (same block shapes as the airtuerk-service brand pages, 0012).
-- airLounge is seeded too (content ready even though hidden_in_sidebar hides it
-- today, D-043). No master-deck blocks (the Webflow source used # placeholders).
-- Idempotent: delete the block types we insert for all IBE sub-pages first.

DELETE FROM public.blocks
WHERE page_id IN (SELECT id FROM public.pages WHERE full_path LIKE '/ibe-product-suite/%')
  AND type IN ('description', 'logo_showcase');

-- multicheck
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Multi-source fare search and comparison across GDS and NDC connections. The core engine powering airtuerk''s OTA and agency partner integrations.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/multicheck';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"multicheck","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/multicheck/multicheck_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/multicheck/multicheck_Logo.zip","packageLabel":"multicheck Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/multicheck';

-- rentalCar
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Car rental booking fully integrated across airtuerk platforms. Ground mobility for every partner — bookable directly alongside flights at point of sale. rentalCar ensures complete journey coverage from runway to road.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/rentalcar';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"rentalCar","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/rentalcar/rentalCar_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/rentalcar/rentalCar_Logo.zip","packageLabel":"rentalCar Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/rentalcar';

-- myBooking
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Self-service booking management for airtuerk agency partners and end users. Post-booking changes, cancellations, ancillary services, and online check-in — all in one place.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/mybooking';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"myBooking","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/mybooking/myBooking_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/mybooking/myBooking_Logo.zip","packageLabel":"myBooking Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/mybooking';

-- myStats
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Reporting and analytics for airtuerk agency partners. Track booking volumes, revenue performance, and platform usage — with exportable data and real-time dashboards. myStats gives partners full visibility into their airtuerk business.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/mystats';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"myStats","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/mystats/myStats_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/mystats/myStats_Logo.zip","packageLabel":"myStats Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/mystats';

-- myTransfer
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Ground transfer booking integrated into the airtuerk ecosystem. Airport pickups, private transfers, and shuttle services — bookable at point of sale alongside flights.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/mytransfer';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"myTransfer","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/mytransfer/myTransfer_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/mytransfer/myTransfer_Logo.zip","packageLabel":"myTransfer Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/mytransfer';

-- cockpit
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>AERTICKET Main Central operations IBE. Booking management, airline connectivity, and platform monitoring in one place. For internal use only — not distributed to agency or OTA partners.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/cockpit';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"cockpit","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/cockpit/Cockpit_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/cockpit/Cockpit_Logo.zip","packageLabel":"cockpit Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/cockpit';

-- airLounge (content ready; page stays hidden_in_sidebar per D-043)
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Our lounge service makes every journey more enjoyable – through comfortable waiting areas at numerous airports worldwide. Comfort and convenience for travelers, integrated into the airtuerk platform.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/airlounge';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 1, 'full',
  '{"mark":"airLounge","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/airlounge/airLounge_Logo.svg","packageSub":"Logo, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/airlounge/airLounge_Logo.zip","packageLabel":"airLounge Logo Package"}'::jsonb
FROM public.pages WHERE full_path = '/ibe-product-suite/airlounge';

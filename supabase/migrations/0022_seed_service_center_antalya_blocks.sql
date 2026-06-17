-- 0022_seed_service_center_antalya_blocks.sql
-- Phase 4 — seed Service Center Antalya as a full brand page, mirroring the
-- airtuerk-service block pattern (0012) with Antalya adjustments: logo is
-- singular (/logo), no /ux, no /linkedin-banner. Brand assets (logo, master
-- deck, letterheads) are inherited from airtuerk Service — there is no separate
-- Antalya logo ZIP yet, so the logo_showcase package link points at the SVG
-- itself (single-file download; one-line update once a ZIP exists). The
-- email-signature sub-page is hardcoded (component_key=email-signature) and is
-- intentionally NOT touched. Idempotent: per page, delete the inserted block
-- types first, then insert.

-- Parent: /service-center-antalya
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/service-center-antalya')
  AND type = 'description';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>airtuerk''s 24/7 support hub in Antalya — the human team behind the booking tech, handling agency requests in real time. Brand assets are inherited from airtuerk Service, with Antalya-specific signature defaults.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya';

-- /service-center-antalya/logo
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/service-center-antalya/logo')
  AND type IN ('logo_showcase', 'logo_grid');
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_showcase', 0, 'full',
  '{"mark":"airtuerk Service Center","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/service-center/airtuerk-Service-Center-Logo.svg","packageSub":"Wordmark, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/service-center/airtuerk-Service-Center-Logo.svg","packageLabel":"Service Center Logo (SVG)"}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya/logo';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_grid', 1, 'full',
  '{"display":"tiles","items":[{"label":"Wordmark","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/service-center/airtuerk-Service-Center-Logo.svg"}]}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya/logo';

-- /service-center-antalya/colors
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/service-center-antalya/colors')
  AND type IN ('color_palette', 'description');
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'color_palette', 0, 'full',
  '{"display":"panels","colors":[{"hex":"#ED1C24","cmyk":"0·100·100·0","name":"Torch Red","role":"PRIMARY"},{"hex":"#C7C6C5","cmyk":"22·17·18·0","name":"Tiara Grey","role":"NEUTRAL"},{"hex":"#17479E","cmyk":"100·85·0·0","name":"Orient Blue","role":"ACCENT"}]}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya/colors';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 1, 'full',
  '{"html":"<p>Please note: Various factors can affect colour reproduction across screens, materials and printing processes. Always use the official HEX values for digital and the CMYK values for print, and request a printed proof before any production run.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya/colors';

-- /service-center-antalya/master-deck
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/service-center-antalya/master-deck')
  AND type = 'document_list';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'document_list', 0, 'full',
  '{"style":"preview_cards","groups":[{"documents":[{"href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/master-deck/airtuerk-service/airtuerk_Master_DE.pdf","lang":"DE","title":"airtuerk Master Deck (DE)","filetype":"pdf"},{"href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/master-deck/airtuerk-service/airtuerk_Master_EN.pdf","lang":"EN","title":"airtuerk Master Deck (EN)","filetype":"pdf"}]}]}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya/master-deck';

-- /service-center-antalya/letterhead
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/service-center-antalya/letterhead')
  AND type = 'document_list';
INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'document_list', 0, 'full',
  '{"style":"list_rows","groups":[{"documents":[{"href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/bank-info/Hauptkonto.zip","meta":"ZIP","title":"Letterheads — Hauptkonto"},{"href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/bank-info/Nebenkonto01.zip","meta":"ZIP","title":"Letterheads — Nebenkonto 01"}]}]}'::jsonb
FROM public.pages WHERE full_path = '/service-center-antalya/letterhead';

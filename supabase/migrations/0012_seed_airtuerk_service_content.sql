-- 0012_seed_airtuerk_service_content.sql
-- Phase 4 Task 8 — seed /airtuerk-service brand-page content (blocks) on the Task 6
-- single-page anchor structure. airtuerk-service ONLY (the template; other brands
-- follow later). Scroll order: hero → Logo & Fav Icon → Colors Logo → Colors UX/UI
-- → Presentation Master Deck → LinkedIn Banner → Letterhead. The email-signature
-- child stays a hardcoded sub-route; signature/OOO inlining is Task 7, so the
-- scroll slot after Letterhead (sort 70+) is intentionally left free.
-- Block `content` matches the zod schemas in src/lib/blocks/schemas.ts. All asset
-- and download URLs are Supabase Storage public URLs (no Webflow).

-- (1) Rename child page titles to the Video-1 section labels. These drive both the
--     in-page section <h2> and the sidebar anchor labels (Task 6 aggregator/getNav).
update public.pages set title = 'Logo & Fav Icon'          where full_path = '/airtuerk-service/logos';
update public.pages set title = 'Colors Logo'              where full_path = '/airtuerk-service/colors';
update public.pages set title = 'Colors UX/UI'             where full_path = '/airtuerk-service/ux';
update public.pages set title = 'Presentation Master Deck' where full_path = '/airtuerk-service/master-deck';

-- (2) Create the LinkedIn Banner child page. sort_order 45 places it between
--     Master Deck (40) and the pre-existing email-signature child (50) — a unique
--     slot that keeps the exact section scroll order (…Master Deck → LinkedIn
--     Banner → Letterhead) without colliding with email-signature's sort_order.
--     Column set mirrors the existing children (parent_id, brand_id).
insert into public.pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, status, hidden_in_sidebar)
select p.parent_id, p.brand_id, 'linkedin-banner', '/airtuerk-service/linkedin-banner', 45, 'LinkedIn Banner', 'blocks', 'draft', false
from public.pages p
where p.full_path = '/airtuerk-service/logos';

-- (3) Seed blocks. page_id resolved by full_path subquery (no hardcoded ids).

-- HERO (parent) — description lead paragraph (title/number come from the
-- single-page aggregator's PageHeader, so no page_hero here to avoid duplication).
insert into public.blocks (page_id, type, position, layout, content)
select id, 'description', 0, 'full',
  '{"html":"<p>The brand home of airtuerk Service GmbH. Logos, letterheads, presentation templates, and email signatures for our flight consolidation business — the foundation of everything airtuerk does.</p>"}'::jsonb
from public.pages where full_path = '/airtuerk-service';

-- LOGO & FAV ICON (/logos) — logo_showcase (wordmark + Download ZIP) + logo_grid (both marks).
insert into public.blocks (page_id, type, position, layout, content)
select id, 'logo_showcase', 0, 'full',
  '{"assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/airtuerk-service/airtuerk-Logo.svg","mark":"airtuerk","packageLabel":"airtuerk Logo Package","packageSub":"Wordmark, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/airtuerk-service/airtuerk-Logo.zip"}'::jsonb
from public.pages where full_path = '/airtuerk-service/logos';
insert into public.blocks (page_id, type, position, layout, content)
select id, 'logo_grid', 1, 'full',
  '{"display":"tiles","items":[{"label":"Wordmark","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/airtuerk-service/airtuerk-Logo.svg"},{"label":"Fav Icon","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/favicon/at-Favicon.svg"}]}'::jsonb
from public.pages where full_path = '/airtuerk-service/logos';

-- COLORS LOGO (/colors) — color_palette (print colours) + a reproduction note.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'color_palette', 0, 'full',
  '{"display":"panels","colors":[{"name":"Torch Red","hex":"#ED1C24","role":"PRIMARY","cmyk":"0·100·100·0"},{"name":"Tiara Grey","hex":"#C7C6C5","role":"NEUTRAL","cmyk":"22·17·18·0"},{"name":"Orient Blue","hex":"#17479E","role":"ACCENT","cmyk":"100·85·0·0"}]}'::jsonb
from public.pages where full_path = '/airtuerk-service/colors';
insert into public.blocks (page_id, type, position, layout, content)
select id, 'description', 1, 'full',
  '{"html":"<p>Please note: Various factors can affect colour reproduction across screens, materials and printing processes. Always use the official HEX values for digital and the CMYK values for print, and request a printed proof before any production run.</p>"}'::jsonb
from public.pages where full_path = '/airtuerk-service/colors';

-- COLORS UX/UI (/ux) — color_palette (UI colours).
insert into public.blocks (page_id, type, position, layout, content)
select id, 'color_palette', 0, 'full',
  '{"display":"panels","colors":[{"name":"Quantum Blue","hex":"#0A82DF","role":"PRIMARY","rgb":"10·130·223·1"},{"name":"Jet Black","hex":"#222222","role":"NEUTRAL","cmyk":"75·68·67·0"},{"name":"Ghost White","hex":"#F7F7F7","role":"SURFACE","cmyk":"2·1·1·0"}]}'::jsonb
from public.pages where full_path = '/airtuerk-service/ux';

-- PRESENTATION MASTER DECK (/master-deck) — document_list (DE + EN PDFs).
insert into public.blocks (page_id, type, position, layout, content)
select id, 'document_list', 0, 'full',
  '{"style":"preview_cards","groups":[{"documents":[{"title":"airtuerk Master Deck (DE)","filetype":"pdf","lang":"DE","href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/master-deck/airtuerk-service/airtuerk_Master_DE.pdf"},{"title":"airtuerk Master Deck (EN)","filetype":"pdf","lang":"EN","href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/master-deck/airtuerk-service/airtuerk_Master_EN.pdf"}]}]}'::jsonb
from public.pages where full_path = '/airtuerk-service/master-deck';

-- LINKEDIN BANNER (/linkedin-banner) — asset_block (banner image + Download Banner).
insert into public.blocks (page_id, type, position, layout, content)
select id, 'asset_block', 0, 'full',
  '{"assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/airtuerk_Banner.png","caption":"LinkedIn banner — 1584 × 396 px","downloads":[{"label":"Download Banner","href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/airtuerk_Banner.png"}]}'::jsonb
from public.pages where full_path = '/airtuerk-service/linkedin-banner';

-- LETTERHEAD (/letterhead) — document_list (Hauptkonto + Nebenkonto 01 zips).
insert into public.blocks (page_id, type, position, layout, content)
select id, 'document_list', 0, 'full',
  '{"style":"list_rows","groups":[{"documents":[{"title":"Letterheads — Hauptkonto","href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/bank-info/Hauptkonto.zip","meta":"ZIP"},{"title":"Letterheads — Nebenkonto 01","href":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/bank-info/Nebenkonto01.zip","meta":"ZIP"}]}]}'::jsonb
from public.pages where full_path = '/airtuerk-service/letterhead';

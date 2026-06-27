-- 0013_seed_holidays_atbeds_content.sql
-- Phase 4 Task 9 — seed brand-page content for airtuerk-holidays + atbeds, using
-- airtuerk-service (migration 0012) as the exact template. DESIGN DECISION: all
-- brands share ONE unified colour identity — the SAME "Colors Logo" and
-- "Colors UX/UI" palettes as airtuerk-service (copied verbatim; only page_id,
-- logos, favicon and brand name differ per brand).
-- Per-brand notes:
--   • airtuerk-holidays has NO /ux page and NO logo-package zip → no Colors UX/UI
--     section and the logo_showcase omits the Download-Assets CTA.
--   • Neither brand has master-deck or letterhead docs, or a LinkedIn banner →
--     those sections render empty-state and NO linkedin-banner page is created
--     (airtuerk-service's banner is NOT reused).
-- Scroll slot after Letterhead left free for Task 7 (no signature/OOO inline).
-- Block `content` matches the zod schemas in src/lib/blocks/schemas.ts; all asset
-- URLs are Supabase Storage public URLs (no Webflow). Touches holidays + atbeds only.

-- ── (1) Title renames → Video-1 section labels ──
update public.pages set title = 'Logo & Fav Icon'          where full_path = '/airtuerk-holidays/logos';
update public.pages set title = 'Colors Logo'              where full_path = '/airtuerk-holidays/colors';
update public.pages set title = 'Presentation Master Deck' where full_path = '/airtuerk-holidays/master-deck';
update public.pages set title = 'Logo & Fav Icon'          where full_path = '/atbeds/logos';
update public.pages set title = 'Colors Logo'              where full_path = '/atbeds/colors';
update public.pages set title = 'Colors UX/UI'             where full_path = '/atbeds/ux';
update public.pages set title = 'Presentation Master Deck' where full_path = '/atbeds/master-deck';

-- ════════════════════ airtuerk-holidays ════════════════════
-- HERO (parent) — description lead paragraph.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'description', 0, 'full',
  '{"html":"<p>The brand home of airtuerk Holidays. Logos, letterheads, presentation templates, and email signatures for the airtuerk Holidays brand — part of the airtuerk family.</p>"}'::jsonb
from public.pages where full_path = '/airtuerk-holidays';

-- LOGO & FAV ICON — logo_showcase (wordmark only; NO logo-package zip exists) + logo_grid.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'logo_showcase', 0, 'full',
  '{"assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/airtuerk-holidays/airtuerkholidays_Logo.svg","mark":"airtuerk Holidays"}'::jsonb
from public.pages where full_path = '/airtuerk-holidays/logos';
insert into public.blocks (page_id, type, position, layout, content)
select id, 'logo_grid', 1, 'full',
  '{"display":"tiles","items":[{"label":"Wordmark","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/airtuerk-holidays/airtuerkholidays_Logo.svg"},{"label":"Fav Icon","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/favicon/airtuerkholidays_Favicon.svg"}]}'::jsonb
from public.pages where full_path = '/airtuerk-holidays/logos';

-- COLORS LOGO — shared palette (verbatim from 0012) + reproduction note.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'color_palette', 0, 'full',
  '{"display":"panels","colors":[{"name":"Torch Red","hex":"#ED1C24","role":"PRIMARY","cmyk":"0·100·100·0"},{"name":"Tiara Grey","hex":"#C7C6C5","role":"NEUTRAL","cmyk":"22·17·18·0"},{"name":"Orient Blue","hex":"#17479E","role":"ACCENT","cmyk":"100·85·0·0"}]}'::jsonb
from public.pages where full_path = '/airtuerk-holidays/colors';
insert into public.blocks (page_id, type, position, layout, content)
select id, 'description', 1, 'full',
  '{"html":"<p>Please note: Various factors can affect colour reproduction across screens, materials and printing processes. Always use the official HEX values for digital and the CMYK values for print, and request a printed proof before any production run.</p>"}'::jsonb
from public.pages where full_path = '/airtuerk-holidays/colors';

-- ════════════════════ atbeds ════════════════════
-- HERO (parent) — description lead paragraph.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'description', 0, 'full',
  '{"html":"<p>The brand home of atBeds. Logos, letterheads, presentation templates, and email signatures for the atBeds brand — part of the airtuerk family.</p>"}'::jsonb
from public.pages where full_path = '/atbeds';

-- LOGO & FAV ICON — logo_showcase (wordmark + Download ZIP logo-package) + logo_grid.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'logo_showcase', 0, 'full',
  '{"assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/atbeds/atBeds_Logo.svg","mark":"atBeds","packageLabel":"atBeds Logo Package","packageSub":"Wordmark, fav icon & all formats","packageHref":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/documents/logo-package/atbeds/atBeds-Logo.zip"}'::jsonb
from public.pages where full_path = '/atbeds/logos';
insert into public.blocks (page_id, type, position, layout, content)
select id, 'logo_grid', 1, 'full',
  '{"display":"tiles","items":[{"label":"Wordmark","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/brand-logos/atbeds/atBeds_Logo.svg"},{"label":"Fav Icon","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/favicon/atBeds_Favicon.svg"}]}'::jsonb
from public.pages where full_path = '/atbeds/logos';

-- COLORS LOGO — shared palette (verbatim from 0012) + reproduction note.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'color_palette', 0, 'full',
  '{"display":"panels","colors":[{"name":"Torch Red","hex":"#ED1C24","role":"PRIMARY","cmyk":"0·100·100·0"},{"name":"Tiara Grey","hex":"#C7C6C5","role":"NEUTRAL","cmyk":"22·17·18·0"},{"name":"Orient Blue","hex":"#17479E","role":"ACCENT","cmyk":"100·85·0·0"}]}'::jsonb
from public.pages where full_path = '/atbeds/colors';
insert into public.blocks (page_id, type, position, layout, content)
select id, 'description', 1, 'full',
  '{"html":"<p>Please note: Various factors can affect colour reproduction across screens, materials and printing processes. Always use the official HEX values for digital and the CMYK values for print, and request a printed proof before any production run.</p>"}'::jsonb
from public.pages where full_path = '/atbeds/colors';

-- COLORS UX/UI — shared UI palette (verbatim from 0012). atbeds only.
insert into public.blocks (page_id, type, position, layout, content)
select id, 'color_palette', 0, 'full',
  '{"display":"panels","colors":[{"name":"Quantum Blue","hex":"#0A82DF","role":"PRIMARY","rgb":"10·130·223·1"},{"name":"Jet Black","hex":"#222222","role":"NEUTRAL","cmyk":"75·68·67·0"},{"name":"Ghost White","hex":"#F7F7F7","role":"SURFACE","cmyk":"2·1·1·0"}]}'::jsonb
from public.pages where full_path = '/atbeds/ux';

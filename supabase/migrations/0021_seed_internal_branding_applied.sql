-- 0021_seed_internal_branding_applied.sql
-- Phase 4 — seed the Internal Branding parent (intro) and the Applied Identity
-- sub-page (description + logo_grid of merch/mockup tiles). The configurator
-- sub-page is hardcoded (identity-configurator) and intentionally NOT touched.
-- Idempotent: deletes the inserted block types for these two pages first.

-- Parent: /internal-branding (intro description)
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/internal-branding')
  AND type = 'description';

INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>A new identity for how we show up as an employer — forward united. Consistent across wallpapers, merchandise, recruitment material, and every surface where the airtuerk team meets the world.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/internal-branding';

-- Sub-page: /internal-branding/applied-identity (description + logo_grid)
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/internal-branding/applied-identity')
  AND type IN ('description', 'logo_grid');

INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'description', 0, 'full',
  '{"html":"<p>Small objects, shared signals. Wallpapers, merchandise, and everyday items that turn the airtuerk identity into something people see, use, and carry with them.</p>"}'::jsonb
FROM public.pages WHERE full_path = '/internal-branding/applied-identity';

INSERT INTO public.blocks (page_id, type, position, layout, content)
SELECT id, 'logo_grid', 1, 'full',
  '{"display":"tiles","items":[{"label":"iPhone Mockup","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/product-shots/iPhone-Mockup.png"},{"label":"Tote Bag","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/redtote-1.png"},{"label":"Notebook","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/notebook-1.png"},{"label":"Team Wear (Mixed)","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/manwomen.png"},{"label":"Team Wear (Women)","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/women.png"},{"label":"Wallpaper","assetUrl":"https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/misc/wh_bg-1.png"}]}'::jsonb
FROM public.pages WHERE full_path = '/internal-branding/applied-identity';

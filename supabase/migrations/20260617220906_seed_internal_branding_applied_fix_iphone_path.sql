-- 20260617220906_seed_internal_branding_applied_fix_iphone_path.sql
-- Reconstructed from supabase_migrations.schema_migrations.statements
-- (DB-only entry). Effect already applied to prod. This file restores
-- byte-exact source-of-truth parity with the ledger.
--
-- Recon source: spec/LEDGER_DRIFT_RECON.md §A2.1 (commit 8a2fd51)

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
-- 0042_avatars_extend_bucket_check_and_migrate_assets
--
-- Phase 2 Schritt 2 (2026-06-22): assets-Rows der 6 Team-Member-Avatare auf
-- den neuen avatars-Bucket umgestellt. Files wurden in Phase 2 Schritt 1
-- per supabase.storage.from('images').copy(...) kopiert (HTTP-200-verifiziert).
--
-- WICHTIG: Erster Versuch dieser Migration scheiterte an einer alten
-- assets_bucket_check CHECK-Constraint, die nur ('images', 'documents',
-- 'videos', 'fonts') zuließ. Diese Constraint wird zuerst erweitert um
-- 'avatars'. Memory enthielt diesen Constraint nicht — wurde durch den
-- Fehlerschlag entdeckt.
--
-- Drei Felder pro asset werden geupdatet:
--   • bucket: 'images' → 'avatars'
--   • storage_path: 'team/<name>.png' → '<team_member_uuid>/avatar.png'
--   • public_url: vollständig neu gebaut (denormalisiert in Production)
--
-- Atomisch in einer Transaktion: wenn ein UPDATE fehlschlägt, rollback all.
-- ALTE Files im images-Bucket bleiben unangetastet — werden separat
-- über Storage-API gelöscht (kein SQL möglich, protect_delete-Trigger).

BEGIN;

-- 0) CHECK-Constraint erweitern um 'avatars'
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_bucket_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_bucket_check
  CHECK (bucket = ANY (ARRAY['images'::text, 'documents'::text, 'videos'::text, 'fonts'::text, 'avatars'::text]));

-- 1) Ahmet Oezbek (asset 8cd2c520, team_member 0712257e)
UPDATE public.assets
SET
  bucket = 'avatars',
  storage_path = '0712257e-2fff-4833-b85e-cac09655d76a/avatar.png',
  public_url = 'https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/avatars/0712257e-2fff-4833-b85e-cac09655d76a/avatar.png',
  updated_at = NOW()
WHERE id = '8cd2c520-fb38-4b0f-9164-b3224d256152';

-- 2) Buhara Demir
UPDATE public.assets
SET
  bucket = 'avatars',
  storage_path = '6303ee11-ece4-4a6f-b5da-79814a517947/avatar.png',
  public_url = 'https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/avatars/6303ee11-ece4-4a6f-b5da-79814a517947/avatar.png',
  updated_at = NOW()
WHERE id = '26b0da30-ad31-4842-9151-fac6a0e201b8';

-- 3) Oruc Demir
UPDATE public.assets
SET
  bucket = 'avatars',
  storage_path = '3063656d-9f8d-41df-bd6c-6aec3c7acab7/avatar.png',
  public_url = 'https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/avatars/3063656d-9f8d-41df-bd6c-6aec3c7acab7/avatar.png',
  updated_at = NOW()
WHERE id = '11356790-ce7f-4064-a25a-fc762da7d53b';

-- 4) Emre Karakas
UPDATE public.assets
SET
  bucket = 'avatars',
  storage_path = '585e8ad0-4bfc-4aca-b313-8595ed483390/avatar.png',
  public_url = 'https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/avatars/585e8ad0-4bfc-4aca-b313-8595ed483390/avatar.png',
  updated_at = NOW()
WHERE id = 'e9745e21-ff2e-4317-b0e9-5b7b1940a30d';

-- 5) Hakan Sezen
UPDATE public.assets
SET
  bucket = 'avatars',
  storage_path = 'fc05d0a1-91a2-4f25-81d1-b262e1189ba7/avatar.png',
  public_url = 'https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/avatars/fc05d0a1-91a2-4f25-81d1-b262e1189ba7/avatar.png',
  updated_at = NOW()
WHERE id = '1118d19c-c024-4d59-ad6c-af074317ffe4';

-- 6) Ümit Tenekeci
UPDATE public.assets
SET
  bucket = 'avatars',
  storage_path = '0a9fed1b-5bb1-43de-a4ec-9005ff5440ce/avatar.png',
  public_url = 'https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/avatars/0a9fed1b-5bb1-43de-a4ec-9005ff5440ce/avatar.png',
  updated_at = NOW()
WHERE id = '30aeefeb-e7eb-4006-8cd0-36c9427aff55';

COMMIT;

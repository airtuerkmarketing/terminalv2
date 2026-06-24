-- Migration: Seed force_password_change Flag für 6 noch-nicht-eingeloggte Accounts
--
-- Kontext: Nach dem Stage-8 Seed (684d67f1) wurden 9 Auth-User mit einem
-- shared crypto-random Temp-Passwort angelegt. Diese 6 Accounts haben sich
-- noch nie selbst eingeloggt und müssen beim ersten Login zwingend ihr
-- Passwort ändern.
--
-- Nicht enthalten: bdemir (Buhara hat schon eigenes PW), dev@ (Test-Account),
-- eerkara (eingeloggt 2026-06-22), skoeroglu (eingeloggt 2026-06-22).

UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('force_password_change', true)
WHERE email IN (
  'aoezbek@airtuerk.de',
  'utenekeci@airtuerk.de',
  'hakan@airtuerk.de',
  'msinim@airtuerk.de',
  'odemir@airtuerk.de',
  'tsahin@airtuerk.de'
);

-- Verify: zeige in der Migration-Ausgabe wie viele User jetzt das Flag haben
DO $$
DECLARE
  flagged_count int;
BEGIN
  SELECT count(*) INTO flagged_count
  FROM auth.users
  WHERE (raw_app_meta_data->>'force_password_change')::boolean = true;
  RAISE NOTICE 'Users with force_password_change=true: % (expected 6)', flagged_count;
END $$;

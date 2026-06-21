-- 0038_avatars_storage_bucket
--
-- Stufe 6 Vorbereitung: dedizierter Storage-Bucket für User-Avatare.
-- Trennung von images/ für klare Semantik, separates Limit, DSGVO-Löschung.
--
-- Pfad-Pattern (Stufe 6): avatars/<team_member_id>/avatar.<ext>
--
-- RLS-Policies auf storage.objects werden separat via execute_sql gesetzt
-- (storage.objects ist Supabase-managed, nicht über Migration-Owner editierbar).
-- Daher enthält dieses File NUR den Bucket-Insert; die 3 Write-Policies
-- (insert/update admin, delete super_admin) wurden zur Laufzeit per
-- execute_sql gesetzt und sind in der Live-DB aktiv.
--
-- WICHTIG bei `supabase db reset`: Die Write-Policies fehlen dann, weil sie
-- nicht in supabase_migrations.schema_migrations sind. Manuelle
-- Rekonstruktion via Dashboard oder execute_sql wäre erforderlich.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

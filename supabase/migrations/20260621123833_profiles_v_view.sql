-- 0037_profiles_v_view
--
-- Stufe 4 des User-Panel-Plans.
-- Die View profiles_v ist die zentrale Read-Quelle für das Admin-Panel.
-- Sie verbindet drei Tabellen, damit das UI in einem einzigen Read auf alle
-- relevanten Felder zugreifen kann:
--
--   • public.profiles      — Auth-Identität (id, email, full_name, role)
--   • auth.users           — last_sign_in_at (Stand der letzten Anmeldung)
--   • public.team_members  — Stammdaten (Name, Department, Position, Avatar,
--                            Geburtstag, Phone, Tools, joined_year, is_lead)
--
-- Diese View ersetzt das "denormalisierte last_sign_in_at"-Feld aus dem
-- ursprünglichen Plan (Finding 4 / Option 1): kein Trigger auf auth.users,
-- keine Cache-Spalte — die View liefert das Feld bei jedem Read frisch.
-- Performance-Optimierung erst bei messbarem Bedarf (>100ms Read-Latency).
--
-- RLS-Verhalten:
--   • Views erben Postgres-Standardmäßig RLS NICHT direkt — sie laufen mit
--     den Rechten des aufrufenden Users, RLS der zugrundeliegenden Tabellen
--     gilt automatisch.
--   • profiles, auth.users, team_members haben alle eigenes RLS.
--   • Konsequenz: ein "user" sieht nur seine eigene Zeile in der View,
--     ein "admin" sieht alle Zeilen (durch profiles-Read-Policy), die View
--     erbt das.
--
-- Schema-Stable-Aspect:
--   • SECURITY INVOKER ist Postgres-Default für Views — der Caller muss
--     SELECT-Rechte auf jede Source-Tabelle haben.
--   • Wir setzen es explizit per ALTER VIEW unten, damit der Default-Wert
--     nicht durch eine Postgres-Upgrade-Änderung kippen kann.

CREATE OR REPLACE VIEW public.profiles_v AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.team_member_id,
  p.created_at,
  p.updated_at,
  -- Aus auth.users
  u.last_sign_in_at,
  u.email_confirmed_at,
  -- Aus team_members
  tm.first_name,
  tm.last_name,
  tm.position,
  tm.department,
  tm.initials,
  tm.avatar_asset_id,
  tm.joined_year,
  tm.is_lead,
  tm.tools,
  tm.date_of_birth,
  tm.show_birthday,
  tm.phone
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN public.team_members tm ON tm.id = p.team_member_id;

-- SECURITY INVOKER explizit setzen (Postgres-Default, aber gegen Upgrade-Drift)
ALTER VIEW public.profiles_v SET (security_invoker = true);

COMMENT ON VIEW public.profiles_v IS
  'Read-only join of profiles + auth.users + team_members for the admin user panel. SECURITY INVOKER (default) — RLS of source tables applies automatically. Updates write to underlying tables directly, not through this view.';

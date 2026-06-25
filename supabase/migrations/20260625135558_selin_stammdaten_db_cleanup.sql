-- Selin Stammdaten — DB-Konsistenz-Cleanup
-- Reproduzierbarkeits-Migration für 2 direkte Prod-Writes (D-056).
--
-- Kontext: Selins team_members-Row wurde am 2026-06-24 direkt auf Prod von
-- "Selin Thoß" / selin.thoss@gmx.de auf "Selin Köroglu" / skoeroglu@airtuerk.de
-- umgestellt — dieser Write wurde NIE als Migration festgehalten (D-056-Lücke).
-- Zwei abgeleitete Felder blieben zudem stale:
--   1. team_members.initials = 'ST'  -> 'SK'  (Avatar-Monogramm in /team + /admin/users)
--   2. gold_set_answers Q7/ai_test_3 vorgeschlagene_antwort: "Selin Thoß (Admin)"
--      -> "Selin Köroglu (Admin)"  (historische Gold-Set-KI-Antwort)
--
-- Schluessel bewusst NICHT per id: team_members.id ist gen_random_uuid und bei
-- einem frischen Replay nicht stabil (0019 seedet eine andere id). Statt dessen
-- per stabilem Fachschluessel (first_name + position) -> idempotent und korrekt
-- sowohl auf Prod (nur initials aendert sich, last_name/email sind no-op) als auch
-- bei Replay-from-scratch (alle drei Felder von Thoß -> Köroglu).
--
-- NICHT enthalten (bewusst):
--   * confluence_chunks (Seite 444008121 "Vtours Genius"): alte E-Mail
--     sthoss@airtuerk.de in einer Outlook-SafeLinks-URL — Confluence-Source,
--     wird beim Re-Sync ueberschrieben -> Fix gehoert in Confluence, nicht hier.
--   * team_members.phone (NULL) — separater Stammdaten-Pass spaeter.
--   * Seed-Migration 0019 bleibt als applied history unangetastet.

-- 1) team_members: volle Identitaet idempotent korrekt setzen
UPDATE public.team_members
   SET last_name = 'Köroglu',
       email     = 'skoeroglu@airtuerk.de',
       initials  = 'SK'
 WHERE first_name = 'Selin'
   AND position   = 'Service Agent';

-- 2) gold_set_answers: nur das betroffene Feld, nur der Name (kein Row-Rewrite)
UPDATE public.gold_set_answers
   SET vorgeschlagene_antwort = REPLACE(vorgeschlagene_antwort, 'Selin Thoß', 'Selin Köroglu')
 WHERE vorgeschlagene_antwort LIKE '%Selin Thoß%';

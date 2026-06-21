-- 0041_function_search_path_fix
--
-- Security-Hardening (S1): die 4 folder-path-Trigger-Funktionen hatten kein
-- explizit gesetztes search_path. Postgres warnt davor, weil ein Angreifer
-- theoretisch eine eigene public.<funktion> erstellen und so Function-Resolution
-- kapern könnte. Praktisch bei euch sehr niedriges Risiko (braucht SQL-Zugriff),
-- aber Best-Practice.
--
-- Fix: search_path explizit auf public + pg_temp setzen. Damit ist die
-- Function-Resolution deterministisch und immun gegen schema-search-Manipulation.
--
-- Alle 4 sind SECURITY INVOKER (kein DEFINER), funktional unverändert.

ALTER FUNCTION public.set_document_folder_path()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.rewrite_document_folder_descendants()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.set_presentation_folder_path()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.rewrite_presentation_folder_descendants()
  SET search_path = public, pg_temp;

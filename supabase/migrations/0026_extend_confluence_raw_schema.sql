-- ============================================================================
-- terminalv2 — Confluence raw: broader coverage (etappe 1b)
-- Migration: 0026_extend_confluence_raw_schema.sql
-- Description: Adds bereich + page_type so the snapshot can store more than
--              "Operative Kanäle": AERCONSO space, WikiOperativ FAQ/Team/News/
--              Support, blog posts. Backfills existing 83 rows.
-- ============================================================================

-- New columns -----------------------------------------------------------------
ALTER TABLE public.confluence_raw
  ADD COLUMN IF NOT EXISTS bereich   text,
  ADD COLUMN IF NOT EXISTS page_type text NOT NULL DEFAULT 'page';

COMMENT ON COLUMN public.confluence_raw.bereich IS
  'Top-level area inside the space. WikiOperativ: operative_kanaele|faq|team|support|news. AERCONSO: aerconso.';
COMMENT ON COLUMN public.confluence_raw.page_type IS
  'Content kind: page | embed | blog | folder. Default page.';

CREATE INDEX IF NOT EXISTS confluence_raw_bereich_idx   ON public.confluence_raw (bereich);
CREATE INDEX IF NOT EXISTS confluence_raw_page_type_idx ON public.confluence_raw (page_type);

-- Backfill existing 83 rows ---------------------------------------------------
-- The embed (kanal='external') points to AERCONSO and is an embed.
UPDATE public.confluence_raw
   SET bereich   = 'aerconso',
       page_type = 'embed'
 WHERE kanal = 'external';

-- All other current rows came from the Operative Kanäle folder.
UPDATE public.confluence_raw
   SET bereich = 'operative_kanaele'
 WHERE bereich IS NULL
   AND kanal IN ('konti','xml','low','b2b','mietwagen','veranstalter');

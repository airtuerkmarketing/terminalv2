-- ============================================================================
-- terminalv2 — Design system + UI settings seed
-- Migration: 0009_design_system_settings.sql
-- Description: Seeds the settings table with design tokens, sidebar config,
--              and document-download style preferences.
-- Phase: 3.5
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Design system tokens (iOS 18 Liquid Glass adapted to airtuerk)
-- ----------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
  ('design.theme.default', '"ios18-light"'::jsonb),
  ('design.theme.allow_dark', 'true'::jsonb),
  ('design.accent.light', '"#0A82DF"'::jsonb),
  ('design.accent.dark',  '"#0A9EFF"'::jsonb),
  ('design.brand.torch',  '"#ED1C24"'::jsonb),
  ('design.brand.orient', '"#17479E"'::jsonb),
  ('design.brand.tiara',  '"#C7C6C5"'::jsonb),
  ('design.brand.jet',    '"#222222"'::jsonb),
  ('design.brand.ghost',  '"#F7F7F7"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ----------------------------------------------------------------------------
-- Sidebar configuration
-- ----------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
  ('sidebar.layout', '{
    "type": "collapsible",
    "default_state": "expanded",
    "width_expanded": 252,
    "width_collapsed": 64,
    "sections": [
      {"id": "dashboard", "show_label": false, "items": ["dashboard"]},
      {"id": "brands", "show_label": false, "label": "Brands & Products"},
      {"id": "resources", "show_label": false, "label": "Resources"}
    ]
  }'::jsonb),
  ('sidebar.ibe_expandable', 'true'::jsonb),
  ('sidebar.ibe_default_open', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ----------------------------------------------------------------------------
-- Orb / ambient background configuration
-- ----------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
  ('design.orbs.toggleable', 'true'::jsonb),
  ('design.orbs.default_landing', 'true'::jsonb),
  ('design.orbs.default_detail', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ----------------------------------------------------------------------------
-- Document download style preferences
-- ----------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
  ('documents.download_style.default', '"preview_cards"'::jsonb),
  ('documents.download_style.options', '["list_rows", "preview_cards", "image_outline_button"]'::jsonb),
  ('documents.download_style.per_document_override', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ----------------------------------------------------------------------------
-- Per-document download style override column
-- Allows each document to opt into a different style than the site default.
-- ----------------------------------------------------------------------------

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS download_style text
  CHECK (download_style IS NULL OR download_style IN
    ('list_rows', 'preview_cards', 'image_outline_button'));

COMMENT ON COLUMN documents.download_style IS
  'Override the default document download display style for this document. NULL = use site default from settings.documents.download_style.default.';

-- ----------------------------------------------------------------------------
-- Block type: document_list — add style metadata
-- (We do not modify the block schema column here; this is documented in
-- ARCHITECTURE.md §4. Just noting the runtime contract.)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Presentation Hub section structure (for the new sectioned list UI)
-- ----------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
  ('presentation_hub.sections', '[
    {"slug": "sales", "title": "Sales Presentations", "sort_order": 10},
    {"slug": "general", "title": "General Presentations", "sort_order": 20},
    {"slug": "executive", "title": "Executive Decks", "sort_order": 30},
    {"slug": "partner", "title": "Partner Decks", "sort_order": 40},
    {"slug": "internal", "title": "Internal Decks", "sort_order": 50}
  ]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Document category to support Presentation Hub
-- (decks live in documents table, filtered by category and a new
--  presentation_section column)

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS presentation_section text;

COMMENT ON COLUMN documents.presentation_section IS
  'For documents shown on Presentation Hub. Maps to settings.presentation_hub.sections[].slug. NULL = not shown on Presentation Hub.';

CREATE INDEX IF NOT EXISTS documents_presentation_section_idx
  ON documents (presentation_section)
  WHERE presentation_section IS NOT NULL;

-- ============================================================================
-- terminalv2 — Initial schema
-- Migration: 0001_initial_schema.sql
-- Description: Creates all 9 tables (8 entities + 1 junction), enums,
--              constraints, indexes. No RLS here (see 0002). No seed (0004+).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums (used as text + check constraints for portability)
-- ----------------------------------------------------------------------------

-- We use TEXT + CHECK constraints instead of CREATE TYPE to make schema
-- changes easier (no ALTER TYPE dance). Documented values:
--   pages.status:         'draft' | 'published'
--   pages.rendering_mode: 'blocks' | 'hardcoded'
--   blocks.layout:        'full' | 'two-column'
--   assets.bucket:        'images' | 'documents' | 'videos' | 'fonts'
--   profiles.role:        'admin' | 'editor' | 'viewer'
--   documents.language:   'de' | 'en'

-- ----------------------------------------------------------------------------
-- 1. brands
-- ----------------------------------------------------------------------------

CREATE TABLE brands (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  short_name      text NOT NULL,
  tagline         text,
  description     text,
  logo_asset_id   uuid,  -- FK added after assets exists
  primary_color   text,  -- e.g. '#ED1C24'
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brands_sort_order_idx ON brands (sort_order);

-- ----------------------------------------------------------------------------
-- 2. pages  (self-referencing tree)
-- ----------------------------------------------------------------------------

CREATE TABLE pages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id         uuid REFERENCES pages(id) ON DELETE CASCADE,
  brand_id          uuid REFERENCES brands(id) ON DELETE SET NULL,
  slug              text NOT NULL,
  full_path         text NOT NULL UNIQUE,
  number            integer,  -- NULL for sub-pages and standalone pages
  sort_order        integer NOT NULL DEFAULT 0,
  title             text NOT NULL,
  meta_title        text,
  meta_description  text,
  og_asset_id       uuid,  -- FK added after assets exists
  rendering_mode    text NOT NULL DEFAULT 'blocks'
                    CHECK (rendering_mode IN ('blocks', 'hardcoded')),
  component_key     text,  -- non-null when rendering_mode='hardcoded'
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published')),
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- top-level pages must have a number, sub-pages must not
  CONSTRAINT pages_numbering CHECK (
    (parent_id IS NULL AND number IS NOT NULL) OR
    (parent_id IS NOT NULL AND number IS NULL) OR
    (parent_id IS NULL AND number IS NULL)  -- standalone pages
  ),

  -- hardcoded pages must have a component_key
  CONSTRAINT pages_hardcoded_needs_key CHECK (
    rendering_mode = 'blocks' OR component_key IS NOT NULL
  )
);

CREATE INDEX pages_parent_id_idx        ON pages (parent_id);
CREATE INDEX pages_brand_id_idx         ON pages (brand_id);
CREATE INDEX pages_status_published_idx ON pages (status, published_at);
CREATE INDEX pages_sort_order_idx       ON pages (sort_order);

-- ----------------------------------------------------------------------------
-- 3. blocks  (content of rendering_mode='blocks' pages)
-- ----------------------------------------------------------------------------

CREATE TABLE blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type        text NOT NULL,  -- validated against registry at app layer
  position    integer NOT NULL DEFAULT 0,
  layout      text NOT NULL DEFAULT 'full'
              CHECK (layout IN ('full', 'two-column')),
  heading     text,
  anchor      text,           -- optional in-page anchor ID
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blocks_page_position_idx ON blocks (page_id, position);
CREATE INDEX blocks_type_idx          ON blocks (type);

-- ----------------------------------------------------------------------------
-- 4. assets  (every uploaded file: images, videos, fonts)
-- ----------------------------------------------------------------------------

CREATE TABLE assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket            text NOT NULL
                    CHECK (bucket IN ('images', 'documents', 'videos', 'fonts')),
  storage_path      text NOT NULL,  -- e.g. 'brand-logos/airtuerk/airtuerk-Logo.svg'
  public_url        text NOT NULL,  -- full Supabase Storage URL
  filename          text NOT NULL,
  mime_type         text NOT NULL,
  size_bytes        bigint NOT NULL,
  width             integer,
  height            integer,
  duration_seconds  integer,
  alt_text          text,
  caption           text,
  tags              text[] NOT NULL DEFAULT '{}',
  brand_id          uuid REFERENCES brands(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (bucket, storage_path)
);

CREATE INDEX assets_bucket_idx    ON assets (bucket);
CREATE INDEX assets_brand_id_idx  ON assets (brand_id);
CREATE INDEX assets_tags_gin_idx  ON assets USING GIN (tags);

-- Now that assets exists, add the deferred FK constraints
ALTER TABLE brands
  ADD CONSTRAINT brands_logo_asset_id_fkey
  FOREIGN KEY (logo_asset_id) REFERENCES assets(id) ON DELETE SET NULL;

ALTER TABLE pages
  ADD CONSTRAINT pages_og_asset_id_fkey
  FOREIGN KEY (og_asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 5. documents  (first-class document type)
-- ----------------------------------------------------------------------------

CREATE TABLE documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  preview_asset_id  uuid REFERENCES assets(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  category          text NOT NULL,
  -- known categories: 'framework-agreement', 'partner-agreement',
  -- 'sepa-mandate', 'master-deck', 'logo-package', 'nda', 'api-doc',
  -- 'magazine', 'bank-info', 'hr-form', 'reference', 'misc'
  language          text CHECK (language IN ('de', 'en') OR language IS NULL),
  brand_id          uuid REFERENCES brands(id) ON DELETE SET NULL,
  version           text,
  pair_id           uuid REFERENCES documents(id) ON DELETE SET NULL,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_category_idx  ON documents (category);
CREATE INDEX documents_language_idx  ON documents (language);
CREATE INDEX documents_brand_id_idx  ON documents (brand_id);
CREATE INDEX documents_pair_id_idx   ON documents (pair_id);

-- ----------------------------------------------------------------------------
-- 6. team_members  (63 people)
-- ----------------------------------------------------------------------------

CREATE TABLE team_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name       text NOT NULL,
  last_name        text NOT NULL,
  position         text,
  department       text,  -- 'Management' | 'Service' | 'Finance' | ...
  initials         text NOT NULL,  -- computed at insert, e.g. 'UT'
  avatar_asset_id  uuid REFERENCES assets(id) ON DELETE SET NULL,
  email            text,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_members_department_idx ON team_members (department);
CREATE INDEX team_members_sort_order_idx ON team_members (sort_order);

-- ----------------------------------------------------------------------------
-- 7. team_member_brands  (junction: many-to-many)
-- ----------------------------------------------------------------------------

CREATE TABLE team_member_brands (
  team_member_id  uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  brand_id        uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (team_member_id, brand_id)
);

CREATE INDEX team_member_brands_brand_idx
  ON team_member_brands (brand_id);

-- ----------------------------------------------------------------------------
-- 8. settings  (key/value config)
-- ----------------------------------------------------------------------------

CREATE TABLE settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. profiles  (mirror of auth.users with role)
-- ----------------------------------------------------------------------------

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  role        text NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON profiles (role);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- Auto-update updated_at on row update across all tables that have it.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER brands_updated_at        BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER pages_updated_at         BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER blocks_updated_at        BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER assets_updated_at        BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER documents_updated_at     BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER team_members_updated_at  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settings_updated_at      BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Comments (helpful in Supabase Studio)
-- ----------------------------------------------------------------------------

COMMENT ON TABLE  brands              IS 'The 8 airtuerk brands';
COMMENT ON TABLE  pages               IS 'Every URL on the site (self-referencing tree)';
COMMENT ON COLUMN pages.full_path     IS 'Computed by app from parent chain + slug; unique';
COMMENT ON COLUMN pages.rendering_mode IS 'blocks = render from blocks table; hardcoded = mount React component';
COMMENT ON COLUMN pages.component_key IS 'React component identifier; required when rendering_mode=hardcoded';
COMMENT ON TABLE  blocks              IS 'Ordered content blocks per page; content shape per type';
COMMENT ON TABLE  assets              IS 'Every uploaded file (images, videos, fonts)';
COMMENT ON TABLE  documents           IS 'First-class document type (PDFs, DOCX, ZIPs)';
COMMENT ON TABLE  team_members        IS '63-person team directory';
COMMENT ON TABLE  team_member_brands  IS 'Many-to-many: team members to brands';
COMMENT ON TABLE  settings            IS 'Site-wide configuration (key/value JSONB)';
COMMENT ON TABLE  profiles            IS 'Admin user profiles (mirror of auth.users with role)';

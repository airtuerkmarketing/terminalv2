-- ============================================================================
-- terminalv2 — APIX Group Structure page (Phase 4, Task 10d)
-- Migration: 0016_apix_group_structure_page.sql
-- ============================================================================
-- The Group Structure org chart is the 4th APIX interactive tool, but unlike
-- the other three it was never seeded a page in 0005. Add a new sub-page of
-- airtuerk APIX pointing at the hardcoded component (component_key='apix-group',
-- dispatched in renderPage like apix-workflow / apix-network / apix-presentation).
-- sort_order 35 places it right after Global Network (30). Idempotent via
-- ON CONFLICT on the unique full_path.
-- ============================================================================

INSERT INTO pages (parent_id, brand_id, slug, full_path, sort_order, title, rendering_mode, component_key, status)
SELECT id, brand_id, 'group-structure', '/airtuerk-apix/group-structure', 35, 'Group Structure', 'hardcoded', 'apix-group', 'draft'
FROM pages WHERE full_path = '/airtuerk-apix'
ON CONFLICT (full_path) DO UPDATE
  SET rendering_mode = 'hardcoded', component_key = 'apix-group';

-- ============================================================================
-- terminalv2 — APIX Presentation player → hardcoded (Phase 4, Task 10b)
-- Migration: 0015_apix_presentation_hardcoded.sql
-- ============================================================================
-- /airtuerk-apix/presentation was seeded in 0005 as rendering_mode='blocks'
-- with NULL component_key. The presentation player is a hardcoded React
-- component (component_key='apix-presentation') that embeds the live
-- SharePoint/Office-Online viewer, dispatched in renderPage like the Workflow
-- (apix-workflow) and the map (apix-network). Point the existing page row at
-- it. Idempotent: re-running the UPDATE is a no-op.
-- ============================================================================

UPDATE pages
SET rendering_mode = 'hardcoded',
    component_key   = 'apix-presentation'
WHERE full_path = '/airtuerk-apix/presentation';

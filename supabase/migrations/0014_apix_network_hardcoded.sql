-- ============================================================================
-- terminalv2 — APIX Global Network → hardcoded (Phase 4, Task 10c)
-- Migration: 0014_apix_network_hardcoded.sql
-- ============================================================================
-- The /airtuerk-apix/global-network page was seeded in 0005 as
-- rendering_mode='blocks' with NULL component_key. The interactive d3 map is a
-- hardcoded React component (component_key='apix-network'), dispatched in
-- renderPage exactly like the Workflow (apix-workflow). Point the existing page
-- row at it. Idempotent: re-running the UPDATE is a no-op.
-- ============================================================================

UPDATE pages
SET rendering_mode = 'hardcoded',
    component_key   = 'apix-network'
WHERE full_path = '/airtuerk-apix/global-network';

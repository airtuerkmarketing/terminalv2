-- ============================================================================
-- 0010: Fix top-level brand card colors to match DESIGN_SYSTEM.md
-- Phase 3.5 hot-fix -- colors from seed (0004) were placeholder values.
-- Already applied to production DB via MCP on 2026-06-15.
-- ============================================================================

UPDATE brands SET primary_color = '#FF8A00' WHERE slug = 'airtuerk-holidays' AND primary_color != '#FF8A00';
UPDATE brands SET primary_color = '#2DBE60' WHERE slug = 'atbeds' AND primary_color != '#2DBE60';
UPDATE brands SET primary_color = '#C0392B' WHERE slug = 'service-center-antalya' AND primary_color != '#C0392B';
UPDATE brands SET primary_color = '#0A82DF' WHERE slug = 'ibe-product-suite' AND primary_color != '#0A82DF';
UPDATE brands SET primary_color = '#6B46C1' WHERE slug = 'internal-branding' AND primary_color != '#6B46C1';
UPDATE brands SET primary_color = '#00868C' WHERE slug = 'airtuerk-apix' AND primary_color != '#00868C';

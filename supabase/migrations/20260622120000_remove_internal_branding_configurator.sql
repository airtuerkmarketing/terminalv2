-- Migration: Entfernt /internal-branding/configurator
--
-- Hintergrund (2026-06-22): Die Page /internal-branding/configurator
-- (component_key='identity-configurator', rendering_mode=hardcoded) hatte
-- KEIN Backing in src/. Sie rendelte nur den generischen HardcodedStub
-- statt eines echten Tools. Nicht-demo-relevant.
--
-- Live wurde sie via execute_sql gelöscht — diese Migration macht
-- den Zustand reproduzierbar für db reset / fresh setups.
--
-- Gesicherte Row-Daten falls Restore nötig:
--   id=703b54d3-c2a6-41fe-90de-55d750f4bcea
--   parent_id=835a158e-8498-42b5-8757-0bdae41006c1 (internal-branding)
--   brand_id=3650eba3-94b7-4abc-a536-90c450a36213
--   slug=configurator, sort_order=20, title=Configurator
--   rendering_mode=hardcoded, component_key=identity-configurator
--   status=published

DELETE FROM public.pages
WHERE full_path = '/internal-branding/configurator';

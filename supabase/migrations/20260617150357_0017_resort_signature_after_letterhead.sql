-- 0017_resort_signature_after_letterhead.sql
-- Phase 4 Task 11 — move /airtuerk-service/email-signature after Letterhead
-- (sort_order 60) so it appears as the last in-page anchor section, not before
-- Letterhead. Setting to 70 places it one slot after Letterhead.
-- Idempotent: re-running is a no-op (same value).

UPDATE public.pages
SET sort_order = 70
WHERE full_path = '/airtuerk-service/email-signature';

-- Migration: Rename brand sub-page titles for sidebar/heading consistency.
-- The sidebar anchor labels read pages.title directly; the in-page <h2> on the
-- 4 TSX brands is updated in matching TSX (brand-data.ts / brand-page.tsx /
-- linkedin-banner-section.tsx) in the same commit. Slugs/anchors unchanged.
-- Verified pre-apply (2026-06-25): exact-title row counts 3/3/2/3/4/1 + antalya 1/1.

-- Exact-title renames (service / holidays / atbeds, + antalya email-signature):
UPDATE pages SET title = 'Logos'        WHERE title = 'Logo & Fav Icon';
UPDATE pages SET title = 'Print Colors' WHERE title = 'Colors Logo';
UPDATE pages SET title = 'UX Colors'    WHERE title = 'Colors UX/UI';
UPDATE pages SET title = 'Master Deck'  WHERE title = 'Presentation Master Deck';
UPDATE pages SET title = 'Signature'    WHERE title = 'Email Signature';
UPDATE pages SET title = 'LinkedIn'     WHERE title = 'LinkedIn Banner';

-- Antalya special-case titles (slug stays 'logo' singular; title made consistent):
UPDATE pages SET title = 'Logos'        WHERE full_path = '/service-center-antalya/logo'   AND title = 'Logo';
UPDATE pages SET title = 'Print Colors' WHERE full_path = '/service-center-antalya/colors' AND title = 'Colors';
-- Letterhead unchanged. APIX / internal-branding carry none of these strings.

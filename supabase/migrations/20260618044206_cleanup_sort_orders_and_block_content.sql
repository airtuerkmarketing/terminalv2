/*
 * DB-Cleanup nach UX-Sweep (corrected scope — see UX_AUDIT follow-up).
 * Ground truth (Phase 0): there are NO real sibling sort_order collisions
 * (GROUP BY parent_id, sort_order HAVING count>1 → 0 rows). The "parent vs
 * child" collisions in the original brief are different ordering scopes
 * (parent_id=NULL vs parent_id=brand) and never conflict — so the proposed
 * parent sort_order rotations are DROPPED (they fixed nothing and antalya+ibe
 * both →55 would have created a real top-level duplicate).
 *
 * This migration keeps only the genuinely valid cleanups:
 *  1. Antalya child order: letterhead before email-signature (Buhara).
 *  2. Strip redundant "meta":"ZIP" from letterhead document_list items
 *     (after the BUG-2 fix the .ft badge already shows "ZIP"; the meta sub
 *     rendered a second "ZIP").
 *  3. Remove the redundant logo_grid on /service-center-antalya/logo
 *     (it duplicates the logo_showcase wordmark, same SVG).
 *  4. Update the brands table comment to reflect 15 brands.
 *
 * SECURITY DEFINER hardening (handle_new_user/is_admin) is DEFERRED: is_admin()
 * is used in 23 RLS policies incl. public-read tables, so REVOKE FROM anon
 * risks breaking anonymous reads. Needs get_advisors + a Supabase branch test.
 * All statements idempotent.
 */

-- 1) Antalya: letterhead (was 50) before email-signature (was 40)
UPDATE public.pages SET sort_order = 40 WHERE full_path = '/service-center-antalya/letterhead';
UPDATE public.pages SET sort_order = 50 WHERE full_path = '/service-center-antalya/email-signature';

-- 2) Strip "meta" from letterhead document_list items (removing an absent key
--    is a no-op → idempotent).
UPDATE public.blocks
SET content = jsonb_set(
  content,
  '{groups}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        grp,
        '{documents}',
        (SELECT jsonb_agg(doc - 'meta') FROM jsonb_array_elements(grp->'documents') AS doc)
      )
    )
    FROM jsonb_array_elements(content->'groups') AS grp
  )
)
WHERE type = 'document_list'
  AND page_id IN (SELECT id FROM public.pages WHERE full_path IN (
    '/airtuerk-service/letterhead',
    '/service-center-antalya/letterhead'
  ))
  AND content->'groups' IS NOT NULL;

-- 3) Remove redundant logo_grid on Antalya logo page (keep logo_showcase).
DELETE FROM public.blocks
WHERE page_id = (SELECT id FROM public.pages WHERE full_path = '/service-center-antalya/logo')
  AND type = 'logo_grid';

-- 4) Brands table comment.
COMMENT ON TABLE public.brands IS 'The airtuerk brand hierarchy: 8 top-level brands + 7 IBE child brands (15 total)';

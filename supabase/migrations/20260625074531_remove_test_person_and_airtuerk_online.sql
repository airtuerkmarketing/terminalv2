-- Migration: Remove test person 287d1b87 + airtuerk.online corp domain
-- Test person: terminal@airtuerk.online ("Test Terminal", role=user), created
-- 2026-06-24 for invite-system tests, now obsolete.
-- FK-respecting order; verified read-only in Phase A (Cleanup-Welle 2,
-- 2026-06-25): activity_log=0, profiles.role=user, team_member_brands=0,
-- no owned content in any SET-NULL table.

-- 1. Activity log (0 rows; listed for completeness)
DELETE FROM user_activity_log
WHERE user_id = 'dc57331c-5bf3-4499-98b8-19df37a15582';

-- 2. Profile (explicit, ahead of the auth.users CASCADE)
DELETE FROM profiles
WHERE id = 'dc57331c-5bf3-4499-98b8-19df37a15582';

-- 3. Auth user (cascades auth-internal identities/sessions/mfa/one_time_tokens)
DELETE FROM auth.users
WHERE id = 'dc57331c-5bf3-4499-98b8-19df37a15582';

-- 4. team_members (cascades team_member_brands = 0 rows)
DELETE FROM team_members
WHERE id = '287d1b87-c0fa-415f-94d8-349b2956e9f7';

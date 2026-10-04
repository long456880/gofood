-- notifications and recipe_reports were reachable unauthenticated via the
-- PostgREST REST API (no RLS, no policies needed to read/write them) --
-- meaning anyone with the app's public anon key could read or write every
-- user's notifications and every recipe report directly, bypassing the
-- app's own Expo API routes entirely.
--
-- The app itself never queries these tables through PostgREST -- it goes
-- through the Expo API routes using DATABASE_URL, which bypasses RLS -- so
-- enabling RLS with no policies here only closes the public REST endpoint,
-- same as the favorites/ratings fix in
-- 20260831075544_fix_profile_auth_fk_and_rls.sql.
alter table public.notifications enable row level security;
alter table public.recipe_reports enable row level security;

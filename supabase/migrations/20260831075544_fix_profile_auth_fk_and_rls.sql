-- profiles.id was still FK'd to the old better-auth "user" table, so the
-- Supabase auth trigger (handle_new_user -> insert into profiles) violated
-- the constraint for any new auth.users signup and rolled back sign-up
-- entirely. Drop it; profiles.id is matched against auth.users.id at the
-- application layer (see lib/supabase-server.ts) instead of a DB-level FK
-- for now, since public.user (and its id format) is being retired.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- favorites and ratings were exposed unauthenticated via the PostgREST
-- REST API (no policies were needed to reach them). The app itself never
-- queries them through PostgREST -- it goes through the Expo API routes
-- using DATABASE_URL, which bypasses RLS -- so enabling RLS with no
-- policies here only closes the public REST endpoint.
alter table public.favorites enable row level security;
alter table public.ratings enable row level security;

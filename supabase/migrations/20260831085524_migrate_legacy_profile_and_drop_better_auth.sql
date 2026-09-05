-- The legacy better-auth profile (id 'KtkXURY8NnShRIzSCojslxFCF8evQFud',
-- feihengkimborat@gmail.com) predates the Supabase Auth migration and was
-- never linked to a real auth.users row. That user has now signed in for
-- real via Supabase, creating auth.users id 'f2291816-f438-4d73-8e30-
-- 117c9bbc1910' and a blank profile via handle_new_user(). Carry the
-- valuable fields (points, chef status, earnings, avatar) onto the new
-- row, repoint everything that referenced the old id, then retire the
-- old row and the better-auth tables it depended on.

update public.profiles
set
  points = legacy.points,
  account_type = legacy.account_type,
  earnings_usd = legacy.earnings_usd,
  avatar_url = legacy.avatar_url
from (
  select points, account_type, earnings_usd, avatar_url
  from public.profiles
  where id = 'KtkXURY8NnShRIzSCojslxFCF8evQFud'
) as legacy
where public.profiles.id = 'f2291816-f438-4d73-8e30-117c9bbc1910';

update public.favorites
set user_id = 'f2291816-f438-4d73-8e30-117c9bbc1910'
where user_id = 'KtkXURY8NnShRIzSCojslxFCF8evQFud';

update public.ratings
set user_id = 'f2291816-f438-4d73-8e30-117c9bbc1910'
where user_id = 'KtkXURY8NnShRIzSCojslxFCF8evQFud';

update public.recipes
set chef_id = 'f2291816-f438-4d73-8e30-117c9bbc1910'
where chef_id = 'KtkXURY8NnShRIzSCojslxFCF8evQFud';

update public.unlocked_recipes
set user_id = 'f2291816-f438-4d73-8e30-117c9bbc1910'
where user_id = 'KtkXURY8NnShRIzSCojslxFCF8evQFud';

delete from public.profiles
where id = 'KtkXURY8NnShRIzSCojslxFCF8evQFud';

-- Nothing references these anymore (profiles.id lost its FK to
-- public.user in the previous migration). CASCADE covers the internal
-- session/account -> user dependency.
drop table if exists public.session, public.account, public.verification, public."user" cascade;

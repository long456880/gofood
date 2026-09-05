-- Seeds two email/password test accounts for manually exercising both
-- account_type roles. Created directly in auth.users/auth.identities
-- (matching Supabase's own schema for an "email" provider identity)
-- since no service_role key is available here to use the Admin API.
-- handle_new_user() fires on insert and creates the matching profiles
-- row with the default account_type ('home_cook'); the chef account is
-- then flipped to 'chef' explicitly.
--
-- chef.test@gofood.dev / ChefTest123!
-- user.test@gofood.dev / UserTest123!

do $$
declare
  chef_id uuid := gen_random_uuid();
  cook_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    reauthentication_token
  ) values
    ('00000000-0000-0000-0000-000000000000', chef_id, 'authenticated', 'authenticated',
     'chef.test@gofood.dev', crypt('ChefTest123!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Test Chef"}'::jsonb,
     now(), now(), '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', cook_id, 'authenticated', 'authenticated',
     'user.test@gofood.dev', crypt('UserTest123!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Test User"}'::jsonb,
     now(), now(), '', '', '', '', '', '');

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), chef_id::text, chef_id,
     jsonb_build_object('sub', chef_id::text, 'email', 'chef.test@gofood.dev', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), cook_id::text, cook_id,
     jsonb_build_object('sub', cook_id::text, 'email', 'user.test@gofood.dev', 'email_verified', true),
     'email', now(), now(), now());

  update public.profiles set account_type = 'chef' where id = chef_id::text;
end $$;

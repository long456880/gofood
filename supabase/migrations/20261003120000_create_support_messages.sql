-- In-app support chat: one thread per user, messages go between that user
-- and the admin. user_id is the thread owner (the non-admin side).
create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  user_id text not null,
  sender text not null check (sender in ('user', 'admin')),
  body text not null check (char_length(body) between 1 and 2000),
  read_by_admin boolean not null default false,
  read_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_user_idx
  on public.support_messages (user_id, created_at);

-- Accessed only through the Expo API routes (DATABASE_URL bypasses RLS);
-- RLS with no policies closes the public PostgREST endpoint.
alter table public.support_messages enable row level security;

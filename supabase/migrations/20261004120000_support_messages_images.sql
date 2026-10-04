-- Support chat can now carry an image (e.g. a payment screenshot). A message
-- may be text, an image, or both, so the body is allowed to be empty as long
-- as there is an image.
alter table public.support_messages
  add column if not exists image_url text;

alter table public.support_messages
  drop constraint if exists support_messages_body_check;

alter table public.support_messages
  add constraint support_messages_body_check
  check (char_length(body) <= 2000 and (char_length(body) > 0 or image_url is not null));

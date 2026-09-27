-- Run in Supabase SQL Editor after docs/schema.sql.
-- Public profile-image reads; each authenticated user can write only to their own folder.

alter table public.app_user
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_own_avatar_path(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_path is null or (storage.foldername(p_path))[1] <> auth.uid()::text then
    raise exception 'Avatar path must belong to the signed-in user';
  end if;

  update public.app_user
  set avatar_path = p_path
  where id = auth.uid();

  if not found then
    raise exception 'User profile was not found';
  end if;
end;
$$;

revoke all on function public.set_own_avatar_path(text) from public;
revoke all on function public.set_own_avatar_path(text) from anon;
grant execute on function public.set_own_avatar_path(text) to authenticated;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users upload avatars to their own folder" on storage.objects;
create policy "Users upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update avatars in their own folder" on storage.objects;
create policy "Users update avatars in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete avatars in their own folder" on storage.objects;
create policy "Users delete avatars in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

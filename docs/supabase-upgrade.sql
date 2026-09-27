-- Run once in Supabase SQL Editor after docs/schema.sql has been applied.
-- Promotes the existing ChronBook admin Auth user and gives Admin UI event access.

alter table public.event_type
  alter column id set default gen_random_uuid();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_user
    where id = auth.uid()
      and id = '18ea6f79-8e4e-47a2-9f8b-8e0373890f1b'::uuid
      and lower(email) = lower('Lanzuela63@gmail.com')
      and role = 'admin'
  );
$$;

-- Create/update the public profile for Auth users that existed before the signup trigger.
insert into public.app_user (id, username, email, email_verified_at, role)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data->>'username', ''), split_part(users.email, '@', 1)),
  users.email,
  case when users.email_confirmed_at is null then null else users.email_confirmed_at end,
  case
    when users.id = '18ea6f79-8e4e-47a2-9f8b-8e0373890f1b'::uuid
      and lower(users.email) = lower('Lanzuela63@gmail.com') then 'admin'
    else 'member'
  end
from auth.users as users
where users.email is not null
on conflict (id) do update
set email = excluded.email,
    email_verified_at = excluded.email_verified_at,
    role = case
      when public.app_user.id = '18ea6f79-8e4e-47a2-9f8b-8e0373890f1b'::uuid
        and lower(excluded.email) = lower('Lanzuela63@gmail.com') then 'admin'
      else 'member'
    end;

alter table public.app_user enable row level security;
alter table public.event_type enable row level security;

drop policy if exists "users can view their own account" on public.app_user;
create policy "users can view their own account"
  on public.app_user for select
  using (id = auth.uid());

drop policy if exists "users can manage their own event types" on public.event_type;
create policy "users can manage their own event types"
  on public.event_type for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

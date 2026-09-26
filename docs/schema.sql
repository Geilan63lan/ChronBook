-- Planned PostgreSQL shape based on the ChronBook relationship diagram.
-- Apply RLS and policies in the same migration as each table; this file is a design starting point.

create table app_user (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  email_verified_at timestamptz,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.app_user (id, username, email, email_verified_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    new.email,
    case when new.email_confirmed_at is null then null else now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table account_settings (
  user_id uuid primary key references app_user(id) on delete cascade,
  display_name text not null,
  booking_slug text not null unique,
  default_time_zone text not null default 'UTC',
  booking_page_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table team (
  id uuid primary key,
  name text not null,
  slug text not null unique
);

create table membership (
  id uuid primary key,
  user_id uuid not null references app_user(id),
  team_id uuid not null references team(id),
  role text not null check (role in ('owner', 'admin', 'member')),
  unique (user_id, team_id)
);

create table schedule (
  id uuid primary key,
  user_id uuid not null references app_user(id),
  name text not null,
  time_zone text not null
);

create table availability_rule (
  id uuid primary key,
  schedule_id uuid not null references schedule(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create table event_type (
  id uuid primary key,
  user_id uuid not null references app_user(id),
  team_id uuid references team(id),
  title text not null,
  slug text not null,
  length_minutes integer not null check (length_minutes > 0),
  unique (user_id, slug)
);

create table booking (
  id uuid primary key,
  event_type_id uuid not null references event_type(id),
  user_id uuid not null references app_user(id),
  uid text not null unique,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  check (end_time > start_time)
);

create table attendee (
  id uuid primary key,
  booking_id uuid not null unique references booking(id) on delete cascade,
  email text not null,
  name text not null,
  time_zone text not null
);

create table payment (
  id uuid primary key,
  booking_id uuid not null unique references booking(id) on delete cascade,
  amount integer not null check (amount >= 0),
  currency text not null,
  success boolean not null default false
);

create table credential (
  id uuid primary key,
  user_id uuid not null references app_user(id),
  type text not null,
  app_id text not null,
  secret_ciphertext text not null
);

alter table app_user enable row level security;
alter table team enable row level security;
alter table membership enable row level security;
alter table schedule enable row level security;
alter table event_type enable row level security;
alter table booking enable row level security;
alter table attendee enable row level security;
alter table payment enable row level security;
alter table credential enable row level security;
alter table account_settings enable row level security;
alter table availability_rule enable row level security;

create policy "users can view their own account"
  on app_user for select
  using (id = auth.uid());

create policy "users can manage their account settings"
  on account_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can manage availability for their schedules"
  on availability_rule for all
  using (exists (select 1 from schedule where schedule.id = availability_rule.schedule_id and schedule.user_id = auth.uid()))
  with check (exists (select 1 from schedule where schedule.id = availability_rule.schedule_id and schedule.user_id = auth.uid()));

create policy "users can manage their own event types"
  on event_type for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can manage their own bookings"
  on booking for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can view attendees for their bookings"
  on attendee for select
  using (exists (select 1 from booking where booking.id = attendee.booking_id and booking.user_id = auth.uid()));

create policy "users can manage payments for their bookings"
  on payment for all
  using (exists (select 1 from booking where booking.id = payment.booking_id and booking.user_id = auth.uid()))
  with check (exists (select 1 from booking where booking.id = payment.booking_id and booking.user_id = auth.uid()));

-- Test every policy with authenticated and unauthenticated database roles before release.

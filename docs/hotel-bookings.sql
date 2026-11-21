-- ChronBook hotel inventory and reservation migration.
-- Run in Supabase SQL Editor after the existing ChronBook schema/upgrades.

create extension if not exists btree_gist;

create table if not exists public.hotel_resource (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  resource_type text not null check (resource_type in ('room', 'event_hall')),
  floor smallint not null check (floor > 0),
  capacity smallint not null default 2 check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.booking
  alter column event_type_id drop not null;

alter table public.booking
  add column if not exists resource_id uuid references public.hotel_resource(id);

alter table public.booking
  add column if not exists guest_count smallint not null default 1 check (guest_count > 0);

alter table public.booking
  drop constraint if exists booking_resource_required;

alter table public.booking
  add constraint booking_resource_required check (resource_id is not null or event_type_id is not null) not valid;

alter table public.booking
  validate constraint booking_resource_required;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hotel_resource_no_overlapping_bookings'
  ) then
    alter table public.booking
      add constraint hotel_resource_no_overlapping_bookings
      exclude using gist (
        resource_id with =,
        tstzrange(start_time, end_time, '[)') with &&
      )
      where (resource_id is not null and status in ('pending', 'confirmed'));
  end if;
end $$;

insert into public.hotel_resource (code, name, resource_type, floor, capacity)
select format('%sRm%s', floor_number, room_number),
       format('Floor %s Room %s', floor_number, room_number),
       'room', floor_number, 2
from generate_series(1, 2) as floors(floor_number)
cross join generate_series(1, 5) as rooms(room_number)
on conflict (code) do nothing;

insert into public.hotel_resource (code, name, resource_type, floor, capacity)
select format('%sEH1', floor_number),
       format('Floor %s Event Hall 1', floor_number),
       'event_hall', floor_number, 100
from generate_series(1, 2) as floors(floor_number)
on conflict (code) do nothing;

alter table public.hotel_resource enable row level security;
alter table public.booking enable row level security;
alter table public.attendee enable row level security;

drop policy if exists "Authenticated users can view active hotel resources" on public.hotel_resource;
create policy "Authenticated users can view active hotel resources"
  on public.hotel_resource for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists "Admins manage hotel resources" on public.hotel_resource;
create policy "Admins manage hotel resources"
  on public.hotel_resource for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Booking ownership stays with the signed-in customer. Resource collisions are
-- rejected by the exclusion constraint, including concurrent attempts.
drop policy if exists "users can manage their own bookings" on public.booking;
create policy "users can manage their own bookings"
  on public.booking for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can add attendees to their bookings" on public.attendee;
create policy "users can add attendees to their bookings"
  on public.attendee for insert
  to authenticated
  with check (exists (
    select 1 from public.booking
    where booking.id = attendee.booking_id and booking.user_id = auth.uid()
  ));

drop policy if exists "users can update attendees on their bookings" on public.attendee;
create policy "users can update attendees on their bookings"
  on public.attendee for update
  to authenticated
  using (exists (
    select 1 from public.booking
    where booking.id = attendee.booking_id and booking.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.booking
    where booking.id = attendee.booking_id and booking.user_id = auth.uid()
  ));

drop policy if exists "users can delete attendees on their bookings" on public.attendee;
create policy "users can delete attendees on their bookings"
  on public.attendee for delete
  to authenticated
  using (exists (
    select 1 from public.booking
    where booking.id = attendee.booking_id and booking.user_id = auth.uid()
  ));

create or replace function public.create_hotel_booking(
  p_resource_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_count integer,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_time_zone text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  created_booking_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to make a reservation';
  end if;

  if length(trim(coalesce(p_guest_name, ''))) not between 1 and 120 then
    raise exception 'Enter a guest name';
  end if;

  if length(trim(coalesce(p_guest_email, ''))) not between 3 and 254 or position('@' in p_guest_email) = 0 then
    raise exception 'Enter a valid guest email';
  end if;

  if p_guest_count is null or p_guest_count < 1 then
    raise exception 'Guest count must be at least one';
  end if;

  if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
    raise exception 'The reservation end must be after its start';
  end if;

  if p_start_time <= now() then
    raise exception 'Reservations must start in the future';
  end if;

  if not exists (select 1 from public.hotel_resource where id = p_resource_id and is_active) then
    raise exception 'This space is unavailable for booking';
  end if;

  if p_guest_count > (select capacity from public.hotel_resource where id = p_resource_id and is_active) then
    raise exception 'Guest count exceeds this space capacity';
  end if;

  insert into public.booking (event_type_id, resource_id, user_id, uid, guest_count, start_time, end_time, status)
  values (null, p_resource_id, auth.uid(), gen_random_uuid()::text, p_guest_count, p_start_time, p_end_time, 'confirmed')
  returning id into created_booking_id;

  insert into public.attendee (booking_id, email, name, time_zone)
  values (created_booking_id, lower(trim(p_guest_email)), trim(p_guest_name), coalesce(nullif(trim(p_time_zone), ''), 'UTC'));

  return created_booking_id;
exception
  when exclusion_violation then
    raise exception using message = 'That room or hall is already booked for part of this time. Choose another space or time.', errcode = 'P0001';
end;
$$;

revoke all on function public.create_hotel_booking(uuid, text, text, integer, timestamptz, timestamptz, text) from public;
revoke all on function public.create_hotel_booking(uuid, text, text, integer, timestamptz, timestamptz, text) from anon;
grant execute on function public.create_hotel_booking(uuid, text, text, integer, timestamptz, timestamptz, text) to authenticated;

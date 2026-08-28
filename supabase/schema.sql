-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query)

create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  event_time time not null,
  capacity integer not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_event_id_idx on bookings(event_id);
create index if not exists events_event_date_idx on events(event_date);

-- Row Level Security: the browser only ever gets an anon key, so we lock
-- writes down completely and only allow public read access to events.
-- All writes (creating events, creating bookings) happen through our own
-- Next.js API routes using the service_role key, which bypasses RLS.
alter table events enable row level security;
alter table bookings enable row level security;

drop policy if exists "Public can view events" on events;
create policy "Public can view events" on events
  for select
  using (true);

-- No public policies on bookings at all -- nobody can read or write bookings
-- directly from the browser. Only server-side code with the service role key can.

-- To show "X spots left" on the public homepage without exposing anyone's
-- name/phone/email, expose only a per-event COUNT through a view. Views are
-- owned by the postgres role by default, so this view can read `bookings`
-- even though the anon key cannot query that table directly.
create or replace view public.event_booking_counts as
select event_id, count(*)::int as booked
from bookings
group by event_id;

grant select on public.event_booking_counts to anon, authenticated;

-- Atomically checks capacity and inserts a booking in a single transaction.
-- This is what actually prevents overbooking: two requests arriving at the
-- same instant will still be serialized by Postgres's row locking, so it's
-- impossible for both to squeeze into the last remaining spot.
-- Returns the new booking's id as text, or the literal string 'FULL'.
create or replace function create_booking_if_space(
  p_event_id uuid,
  p_name text,
  p_phone text,
  p_email text
) returns text
language plpgsql
security definer
as $$
declare
  v_capacity integer;
  v_booked integer;
  v_booking_id uuid;
begin
  -- Lock the event row for the duration of this transaction so concurrent
  -- calls for the same event queue up instead of racing each other.
  select capacity into v_capacity
  from events
  where id = p_event_id
  for update;

  if v_capacity is null then
    raise exception 'Event not found';
  end if;

  select count(*) into v_booked
  from bookings
  where event_id = p_event_id;

  if v_booked >= v_capacity then
    return 'FULL';
  end if;

  insert into bookings (event_id, name, phone, email)
  values (p_event_id, p_name, p_phone, p_email)
  returning id into v_booking_id;

  return v_booking_id::text;
end;
$$;

-- Only the service role (used by our server-side API routes) may call this.
revoke all on function create_booking_if_space from public, anon, authenticated;

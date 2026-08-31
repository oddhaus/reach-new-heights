-- Run this entire file once in your Supabase project's SQL Editor.
-- Do not run only a highlighted section: the booking function at the end uses
-- a dollar-quoted body and must include its closing end; and $$; statements.

create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into categories (name)
values ('Mountain Hike'), ('Beach Workout'), ('Pilates'), ('Yoga'), ('Boxing')
on conflict (name) do nothing;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  event_time time not null,
  event_end_time time,
  capacity integer not null default 20,
  image_url text,
  category_id uuid references categories(id) on delete set null,
  difficulty text not null default 'All Levels',
  address text,
  meeting_instructions text,
  short_description text,
  full_description text,
  slug text unique,
  created_at timestamptz not null default now()
);

alter table events add column if not exists image_url text;
alter table events add column if not exists event_end_time time;
alter table events add column if not exists category_id uuid references categories(id) on delete set null;
alter table events add column if not exists difficulty text not null default 'All Levels';
alter table events add column if not exists address text;
alter table events add column if not exists meeting_instructions text;
alter table events add column if not exists short_description text;
alter table events add column if not exists full_description text;
alter table events add column if not exists slug text unique;
alter table events add column if not exists base_price numeric(10,2) not null default 0;
alter table events add column if not exists extra_activities jsonb not null default '[]'::jsonb;

alter table categories enable row level security;
drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories" on categories for select using (true);

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  age text not null default '0',
  phone text not null,
  email text,
  health_conditions text not null default 'None',
  dietary_restrictions text not null default 'None',
  transport_mode text not null default 'Group Bus',
  carpool_willing text not null default 'No',
  carpool_passengers integer not null default 0,
  selected_activities jsonb not null default '[]'::jsonb,
  payment_policy_accepted boolean not null default false,
  risk_acknowledgement_accepted boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table bookings add column if not exists status text not null default 'active';
alter table bookings add column if not exists suspended_at timestamptz;
update bookings set status = 'active' where status is null or status not in ('active', 'suspended');

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
where status is distinct from 'suspended'
group by event_id;

grant select on public.event_booking_counts to anon, authenticated;

-- Drop previously created overloads first so the migration stays idempotent and
-- can be re-run safely without Postgres complaining about multiple functions
-- sharing the same name.
drop function if exists public.create_booking_if_space(uuid, text, text, text, text, text, text, text, text, integer, jsonb);
drop function if exists public.create_booking_if_space(uuid, text, text, text, text, text, text);
drop function if exists public.create_booking_if_space(uuid, text, text, text, text);
drop function if exists public.create_booking_if_space(uuid, text, text, text);

-- Atomically checks capacity and inserts a booking in a single transaction.
-- This is what actually prevents overbooking: two requests arriving at the
-- same instant will still be serialized by Postgres's row locking, so it's
-- impossible for both to squeeze into the last remaining spot.
-- Returns the new booking's id as text, or the literal string 'FULL'.
create or replace function public.create_booking_if_space(
  p_event_id uuid,
  p_name text,
  p_age text,
  p_phone text,
  p_email text,
  p_health_conditions text default 'None',
  p_dietary_restrictions text default 'None',
  p_transport_mode text default 'Group Bus',
  p_carpool_willing text default 'No',
  p_carpool_passengers integer default 0,
  p_selected_activities jsonb default '[]'::jsonb
) returns text
language plpgsql
security definer
as $$
declare
  v_capacity integer;
  v_booked integer;
  v_booking_id uuid;
  v_health_conditions text;
  v_dietary_restrictions text;
  v_transport_mode text;
  v_carpool_willing text;
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

  v_health_conditions := coalesce(nullif(trim(p_health_conditions), ''), 'None');
  v_dietary_restrictions := coalesce(nullif(trim(p_dietary_restrictions), ''), 'None');
  v_transport_mode := coalesce(nullif(trim(p_transport_mode), ''), 'Group Bus');
  v_carpool_willing := coalesce(nullif(trim(p_carpool_willing), ''), 'No');

  insert into bookings (
    event_id,
    name,
    age,
    phone,
    email,
    health_conditions,
    dietary_restrictions,
    transport_mode,
    carpool_willing,
    carpool_passengers,
    selected_activities,
    payment_policy_accepted,
    risk_acknowledgement_accepted
  )
  values (
    p_event_id,
    p_name,
    coalesce(nullif(trim(p_age), ''), '0'),
    p_phone,
    p_email,
    v_health_conditions,
    v_dietary_restrictions,
    v_transport_mode,
    v_carpool_willing,
    coalesce(p_carpool_passengers, 0),
    coalesce(p_selected_activities, '[]'::jsonb),
    true,
    true
  )
  returning id into v_booking_id;

  return v_booking_id::text;
end;
$$;

-- Only the service role (used by our server-side API routes) may call this.
revoke all on function create_booking_if_space from public, anon, authenticated;

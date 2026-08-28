-- Run this entire file in Supabase SQL Editor for an existing project.
-- It adds event fields, categories, and the public event image bucket.

create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into categories (name)
values ('Mountain Hike'), ('Beach Workout'), ('Pilates'), ('Yoga'), ('Boxing')
on conflict (name) do nothing;

alter table events add column if not exists image_url text;
alter table events add column if not exists event_end_time time;
alter table events add column if not exists category_id uuid references categories(id) on delete set null;
alter table events add column if not exists difficulty text not null default 'All Levels';
alter table events add column if not exists address text;
alter table events add column if not exists meeting_instructions text;
alter table events add column if not exists short_description text;
alter table events add column if not exists full_description text;

alter table categories enable row level security;
drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories" on categories for select using (true);

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

# Reach New Heights — event booking app

A small Next.js + Supabase app that replaces the Bubble app:

- Public homepage lists upcoming events with live "spots left"
- Each event has its own booking page (name, phone, email — no login needed)
- Capacity is enforced server-side, so the site can't be overbooked even if
  two people submit at the exact same second
- `/admin` is a password-protected dashboard to create events, see who's
  registered per event, copy the booking link, or share it straight to
  WhatsApp
- Runs entirely on free tiers: Vercel (hosting) + Supabase (database)

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the dashboard, open **SQL Editor** → **New query**, paste the contents
   of `supabase/schema.sql`, and run it. This creates the `events` and
   `bookings` tables, locks them down with Row Level Security, and adds the
   booking function that prevents overbooking.
3. Go to **Project Settings → API**. You'll need three values from here:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
     never put it in frontend code or commit it to git)

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the four Supabase
values plus:

- `ADMIN_PASSWORD` — the password your friend will type into `/admin/login`
- `ADMIN_SECRET` — a random string used to sign the admin login cookie.
  Generate one with `openssl rand -hex 32`, or any long random string.

## 3. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the public site and
`http://localhost:3000/admin` for the dashboard.

## 4. Deploy

**Option A — Vercel (recommended, free, easiest):**

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. In the project's Environment Variables settings, add the same 6 values
   from your `.env.local`.
4. Deploy. Vercel builds and hosts it automatically, with a free
   `yourproject.vercel.app` URL (or connect a custom domain later).

**Option B — your own server / TMD cloud:**

This is a standard Next.js app, so it also runs anywhere Node.js is
available:

```bash
npm install
npm run build
npm start   # serves on port 3000 by default
```

Put it behind a reverse proxy (nginx/Caddy) for a real domain + HTTPS, and
make sure the same environment variables are set on the server.

## 5. Day-to-day use

- Your friend logs into `/admin`, creates an event (title, date, time,
  location, capacity).
- From the event's admin page, he taps **Share on WhatsApp** to drop the
  booking link straight into the community chat.
- Members open the link, fill in name + phone, and they're booked — no
  account needed.
- He can see the registrant list, and delete an event if it's cancelled
  (this also removes its bookings).

## Notes on how the pieces fit together

- The **anon key** (public, safe to expose) can only *read* the `events`
  table and a `event_booking_counts` view (just numbers, no names/phones).
  It can't write anything and can't read the `bookings` table directly.
- The **service role key** (secret) is only used inside `app/api/**` and
  server components — never sent to the browser — and is what actually
  creates events/bookings.
- Admin auth is a simple signed cookie (no separate user accounts needed,
  since there's only one admin password). It's set on login and checked on
  every admin page/API route.
- Overbooking is prevented by a Postgres function (`create_booking_if_space`
  in `schema.sql`) that locks the event row, checks capacity, and inserts
  the booking all inside one transaction — so it holds up even under
  simultaneous requests.

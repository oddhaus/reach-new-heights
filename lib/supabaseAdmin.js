import { createClient } from "@supabase/supabase-js";

// SECRET client. Only ever import this inside server-side code: Route
// Handlers (app/api/**) or Server Components (files without "use client").
// Never import it into a Client Component -- the service role key bypasses
// Row Level Security entirely, so it must never reach the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);

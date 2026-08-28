import { createClient } from "@supabase/supabase-js";

// Uses the public anon key. RLS only allows this key to SELECT from
// `events`, so it's safe to use from server components too.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

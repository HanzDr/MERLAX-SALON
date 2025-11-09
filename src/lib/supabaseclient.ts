// src/lib/supabaseclient.ts
import { createClient } from "@supabase/supabase-js";

/* ------------------------- Environment Variables ------------------------- */
// Kong URL (local dev = http://127.0.0.1:8000)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;

// Public anon key (safe for browser)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Service role key (❗ server-only, never commit to client bundle)
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

/* ------------------------- Browser/Public Client ------------------------- */
/**
 * Use this everywhere in your frontend (sign in, sign up, read/write public tables).
 * It automatically adds the apikey header for Kong’s key-auth.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      apikey: supabaseAnonKey,
    },
  },
});

/* ------------------------- Admin/Server Client ------------------------- */
/**
 * Use this ONLY in secure contexts (server routes, admin scripts, or edge functions).
 * It bypasses RLS and has full DB access.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: {
    headers: {
      apikey: supabaseServiceRoleKey,
    },
  },
});

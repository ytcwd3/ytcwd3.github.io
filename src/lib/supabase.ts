import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_ytcwd3_YTCWD3SUPABASE_URL || "https://otqhzzoiuqvchrgnmxsp.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_ytcwd3_YTCWD3SUPABASE_ANON_KEY || "sb_publishable_s4p-cAePvtCcqzvIk3HxFg_U3pHku60";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

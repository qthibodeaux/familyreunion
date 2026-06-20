import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmwlwvdughyivbosubcs.supabase.co";
const supabaseKey = "sb_publishable_Qx3yWJoyeVyQIog87D5v4w_vazL_8OV";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables. Check your .env or .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

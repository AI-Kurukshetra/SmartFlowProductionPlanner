import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasPlaceholderUrl = !!supabaseUrl && supabaseUrl.includes("your-project-ref.supabase.co");
  const hasPlaceholderAnonKey = !!supabaseAnonKey && supabaseAnonKey.includes("your-anon-key");
  const isValid = supabaseUrl && supabaseAnonKey && !hasPlaceholderUrl && !hasPlaceholderAnonKey;
  return { supabaseUrl, supabaseAnonKey, isValid };
}

/** Returns Supabase client or null if env vars are missing/invalid */
export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey, isValid } = getEnv();
  if (!isValid || !supabaseUrl || !supabaseAnonKey) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Returns Supabase client or throws if env vars are missing/invalid */
export function createClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Invalid Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }
  return client;
}

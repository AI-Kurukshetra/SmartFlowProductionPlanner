import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const hasPlaceholderUrl = !!supabaseUrl && supabaseUrl.includes("your-project-ref.supabase.co");
  const hasPlaceholderAnonKey = !!supabaseAnonKey && supabaseAnonKey.includes("your-anon-key");

  if (!supabaseUrl || !supabaseAnonKey || hasPlaceholderUrl || hasPlaceholderAnonKey) {
    throw new Error(
      "Invalid Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore setCookie errors in Server Components.
        }
      },
    },
  });
}

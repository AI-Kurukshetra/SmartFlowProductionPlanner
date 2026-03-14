import { createClient } from "@supabase/supabase-js";

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json) as { role?: string };
  } catch {
    return null;
  }
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const serviceRoleKey = rawServiceRoleKey?.replace(/^SUPABASE_SERVICE_ROLE_KEY=/, "");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL.");
  }

  const isSecretFormat = serviceRoleKey.startsWith("sb_secret_");
  if (!isSecretFormat) {
    const payload = decodeJwtPayload(serviceRoleKey);
    if (!payload || payload.role !== "service_role") {
      throw new Error(
        "Invalid SUPABASE_SERVICE_ROLE_KEY. Use the real service_role key from Supabase API settings (not anon/publishable key)."
      );
    }
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

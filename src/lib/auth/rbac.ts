import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AppUserContext = {
  id: string;
  organization_id: string | null;
  role: string;
  is_active: boolean;
};

function displayNameFromAuthUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const meta = user.user_metadata ?? {};
  const n =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";
  if (n.trim()) return n.trim();
  const email = user.email ?? "";
  return email ? email.split("@")[0] || "User" : "User";
}

/**
 * Ensures a row exists in public.app_users for this auth user.
 * Needed when the on_auth_user_created trigger was missing or failed (legacy accounts).
 * Uses service role once; safe because we only insert for the current session's user id.
 */
async function ensureAppUserRow(userId: string, email: string, name: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return false;
  try {
    const admin = createAdminClient();
    const base = {
      id: userId,
      email: email || "",
      name: name || "User",
      role: "operator" as const,
      is_active: true,
    };
    let { error } = await admin.from("app_users").upsert(base, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
    if (error?.message?.includes("is_active")) {
      const { id, email: em, name: nm, role } = base;
      ({ error } = await admin
        .from("app_users")
        .upsert({ id, email: em, name: nm, role }, { onConflict: "id", ignoreDuplicates: true }));
    }
    return !error;
  } catch {
    return false;
  }
}

export async function getCurrentUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, appUser: null as AppUserContext | null };

  let { data: appUser } = await supabase
    .from("app_users")
    .select("id, organization_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser) {
    await ensureAppUserRow(user.id, user.email ?? "", displayNameFromAuthUser(user));
    const again = await supabase
      .from("app_users")
      .select("id, organization_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    appUser = again.data;
  }

  return { supabase, user, appUser: (appUser as AppUserContext | null) ?? null };
}

export async function getEffectiveRoleName(userId: string) {
  const supabase = await createClient();

  const { data: mappedRole } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId)
    .maybeSingle();

  const rolesField = (mappedRole as { roles?: { name?: string } | { name?: string }[] | null } | null)?.roles;
  const roleName =
    Array.isArray(rolesField) ? rolesField[0]?.name ?? null : rolesField?.name ?? null;

  if (roleName) return roleName;

  const { data: appUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return (appUser as { role?: string } | null)?.role ?? null;
}

export async function hasPermission(userId: string, permissionName: string) {
  const supabase = await createClient();

  const roleName = await getEffectiveRoleName(userId);
  if (!roleName) return false;
  if (roleName === "admin") return true;

  const { data: roleRow } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .maybeSingle();

  const roleId = (roleRow as { id?: string } | null)?.id;
  if (!roleId) return false;

  const { data: perm } = await supabase
    .from("role_permissions")
    .select("id, permissions!inner(name)")
    .eq("role_id", roleId)
    .eq("permissions.name", permissionName)
    .maybeSingle();

  return !!perm;
}

export async function requirePermission(permissionName: string) {
  const { user, appUser } = await getCurrentUserContext();

  if (!user) redirect("/login");
  if (!appUser) redirect("/dashboard/setup-required");

  if (!appUser.is_active) {
    throw new Error("Your account is deactivated.");
  }

  const allowed = await hasPermission(user.id, permissionName);
  if (!allowed) {
    throw new Error("Forbidden");
  }

  return { user, appUser };
}

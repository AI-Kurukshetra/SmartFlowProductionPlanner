import { createClient } from "@/lib/supabase/server";

type AppUserContext = {
  id: string;
  organization_id: string | null;
  role: string;
  is_active: boolean;
};

export async function getCurrentUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, appUser: null as AppUserContext | null };

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, organization_id, role, is_active")
    .eq("id", user.id)
    .single();

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

  if (!user || !appUser) {
    throw new Error("Unauthorized");
  }

  if (!appUser.is_active) {
    throw new Error("Your account is deactivated.");
  }

  const allowed = await hasPermission(user.id, permissionName);
  if (!allowed) {
    throw new Error("Forbidden");
  }

  return { user, appUser };
}

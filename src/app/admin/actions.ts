"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/rbac";

function getOriginFromHeaders(allHeaders: Headers) {
  const proto = allHeaders.get("x-forwarded-proto") ?? "http";
  const host = allHeaders.get("x-forwarded-host") ?? allHeaders.get("host");
  return host ? `${proto}://${host}` : "";
}

function normalizeRoleForAppUser(roleName: string) {
  if (roleName === "admin" || roleName === "planner" || roleName === "supervisor" || roleName === "operator") {
    return roleName;
  }
  return "operator";
}

export async function inviteUserAction(formData: FormData) {
  const { appUser } = await requirePermission("manage_users");
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const h = await headers();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const inviteeName = String(formData.get("invitee_name") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "").trim();

  if (!email || !roleId || !appUser.organization_id) {
    throw new Error("Email, role, and organization are required.");
  }

  const { data: roleRow } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();
  if (!roleRow) throw new Error("Role not found.");

  const { data: inviteRow, error: inviteError } = await supabase
    .from("user_invites")
    .insert({
      organization_id: appUser.organization_id,
      email,
      invitee_name: inviteeName || null,
      role_id: roleId,
      invited_by: appUser.id,
    })
    .select("id, invite_token")
    .single();

  if (inviteError || !inviteRow) {
    throw new Error(inviteError?.message ?? "Failed to create invite.");
  }

  const redirectTo = `${getOriginFromHeaders(h)}/auth/callback?next=/auth/set-password`;

  const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existingUser) {
    await supabase.from("user_invites").update({ status: "revoked" }).eq("id", inviteRow.id);
    throw new Error(
      "A user with this email is already registered. Add them from the Users page or ask them to use Forgot password."
    );
  }

  const { data: invited, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      name: inviteeName || email.split("@")[0],
      role: normalizeRoleForAppUser(roleRow.name),
      invite_token: inviteRow.invite_token,
    },
  });

  if (authError) {
    await supabase
      .from("user_invites")
      .update({ status: "revoked" })
      .eq("id", inviteRow.id);
    throw new Error(authError.message);
  }

  if (invited.user?.id) {
    await supabase
      .from("app_users")
      .update({
        organization_id: appUser.organization_id,
        role: normalizeRoleForAppUser(roleRow.name),
      })
      .eq("id", invited.user.id);

    await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: invited.user.id,
          role_id: roleId,
        },
        { onConflict: "user_id" }
      );
  }

  revalidatePath("/admin/users");
}

export async function assignUserRoleAction(formData: FormData) {
  const { appUser } = await requirePermission("manage_users");
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "").trim();
  if (!userId || !roleId || !appUser.organization_id) {
    throw new Error("User and role are required.");
  }

  const { data: member } = await supabase
    .from("app_users")
    .select("id, organization_id")
    .eq("id", userId)
    .single();

  if (!member || member.organization_id !== appUser.organization_id) {
    throw new Error("User not found in your organization.");
  }

  const { data: roleRow } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();
  if (!roleRow) throw new Error("Role not found.");

  const { error: upsertError } = await supabase
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role_id: roleId,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) throw new Error(upsertError.message);

  await supabase
    .from("app_users")
    .update({ role: normalizeRoleForAppUser(roleRow.name) })
    .eq("id", userId);

  revalidatePath("/admin/users");
  revalidatePath("/dashboard/profile");
}

export async function setUserActiveAction(formData: FormData) {
  const { appUser } = await requirePermission("manage_users");
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "") === "true";

  if (!userId || !appUser.organization_id) throw new Error("Invalid request.");

  const { data: member } = await supabase
    .from("app_users")
    .select("id, organization_id")
    .eq("id", userId)
    .single();
  if (!member || member.organization_id !== appUser.organization_id) {
    throw new Error("User not found in your organization.");
  }

  const { error } = await supabase
    .from("app_users")
    .update({
      is_active: isActive,
      deactivated_at: isActive ? null : new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function createRoleAction(formData: FormData) {
  await requirePermission("manage_system");
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) throw new Error("Role name is required.");

  const { error } = await supabase.from("roles").insert({ name, description: description || null });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export async function updateRolePermissionsAction(formData: FormData) {
  await requirePermission("manage_system");
  const supabase = await createClient();

  const roleId = String(formData.get("role_id") ?? "").trim();
  const permissionIds = formData
    .getAll("permission_ids")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!roleId) throw new Error("Role is required.");

  const { error: delError } = await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (delError) throw new Error(delError.message);

  if (permissionIds.length > 0) {
    const rows = permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId }));
    const { error: insError } = await supabase.from("role_permissions").insert(rows);
    if (insError) throw new Error(insError.message);
  }

  revalidatePath("/admin/roles");
}

export async function createPermissionAction(formData: FormData) {
  await requirePermission("manage_system");
  const supabase = await createClient();

  const moduleName = String(formData.get("module") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().toLowerCase();

  if (!moduleName || !name) throw new Error("Module and permission name are required.");

  const { error } = await supabase.from("permissions").insert({ module: moduleName, name });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/permissions");
  revalidatePath("/admin/roles");
}

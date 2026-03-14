import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { createRoleAction, updateRolePermissionsAction } from "@/app/admin/actions";

type PermissionRow = { id: string; name: string; module: string };
type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  role_permissions: { permission_id: string }[];
};

export default async function AdminRolesPage() {
  await requirePermission("manage_system");
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, description, role_permissions(permission_id)")
    .order("name");

  const { data: permissions } = await supabase
    .from("permissions")
    .select("id, name, module")
    .order("module")
    .order("name");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/roles"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
          >
            Create Role
          </Link>
          <Link
            href="/dashboard/admin/permissions"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Create Permission
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Role</h2>
        <form action={createRoleAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            name="name"
            placeholder="e.g. quality_manager"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            name="description"
            placeholder="Role description"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            Create Role
          </button>
        </form>
      </section>

      {(roles as unknown as RoleRow[] | null)?.map((role) => {
        const selected = new Set((role.role_permissions ?? []).map((rp) => rp.permission_id));
        return (
          <section
            key={role.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold capitalize text-slate-900 dark:text-slate-100">{role.name}</h3>
                {role.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{role.description}</p>}
              </div>
              <span className={`role-badge role-${role.name}`}>{role.name}</span>
            </div>

            <form action={updateRolePermissionsAction} className="mt-4">
              <input type="hidden" name="role_id" value={role.id} />
              <div className="grid gap-2 md:grid-cols-2">
                {(permissions as unknown as PermissionRow[] | null)?.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <input type="checkbox" name="permission_ids" value={perm.id} defaultChecked={selected.has(perm.id)} />
                    <span className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{perm.module}</span> / {perm.name}
                    </span>
                  </label>
                ))}
              </div>
              <button type="submit" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                Save Permissions
              </button>
            </form>
          </section>
        );
      })}
    </div>
  );
}

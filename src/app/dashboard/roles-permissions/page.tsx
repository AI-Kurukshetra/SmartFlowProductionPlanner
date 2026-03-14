import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  role_permissions: { permissions: { name: string; module: string } | { name: string; module: string }[] | null }[];
};

export default async function RolesPermissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentUser?.role !== "admin") {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Roles & Permissions</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Only admin can view and manage RBAC.</p>
      </div>
    );
  }

  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, description, role_permissions(permissions(name,module))")
    .order("name");

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Roles & Permissions</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">RBAC matrix for your workspace.</p>

      <div className="mt-6 grid gap-4">
        {(roles as unknown as RoleRow[] | null)?.length ? (
          (roles as unknown as RoleRow[]).map((role) => (
            <section
              key={role.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold capitalize text-slate-900 dark:text-slate-100">{role.name}</h2>
                <span className={`role-badge role-${role.name}`}>{role.name}</span>
              </div>
              {role.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{role.description}</p>}
              <ul className="mt-4 space-y-2">
                {role.role_permissions?.length ? (
                  role.role_permissions.map((rp, idx) => {
                    const permission = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
                    return (
                      <li key={`${role.id}-${idx}`} className="text-sm text-slate-700 dark:text-slate-300">
                        {permission?.module} / {permission?.name}
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm text-slate-500 dark:text-slate-400">No permissions assigned.</li>
                )}
              </ul>
            </section>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            No roles found.
          </div>
        )}
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { createPermissionAction } from "@/app/admin/actions";

type PermissionRow = {
  id: string;
  name: string;
  module: string;
  created_at: string;
};

export default async function AdminPermissionsPage() {
  await requirePermission("manage_system");
  const supabase = await createClient();

  const { data: permissions } = await supabase
    .from("permissions")
    .select("id, name, module, created_at")
    .order("module")
    .order("name");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Permission</h2>
        <form action={createPermissionAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            name="module"
            placeholder="module, e.g. production_tracking"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            name="name"
            placeholder="permission, e.g. approve_runs"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            Create Permission
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Permissions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Module</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Permission</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(permissions as PermissionRow[] | null)?.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">{p.module}</td>
                  <td className="px-3 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</td>
                  <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

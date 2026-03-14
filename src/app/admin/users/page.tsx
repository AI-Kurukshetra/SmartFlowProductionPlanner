import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { assignUserRoleAction, inviteUserAction, setUserActiveAction } from "@/app/admin/actions";

type RoleRow = { id: string; name: string; description: string | null };
type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user_roles: { roles: { id: string; name: string } | { id: string; name: string }[] | null }[] | null;
};

function userName(user: Pick<UserRow, "name" | "email">) {
  return user.name?.trim() || user.email;
}

function effectiveRole(user: UserRow) {
  const roleField = user.user_roles?.[0]?.roles;
  const mappedName = Array.isArray(roleField) ? roleField[0]?.name : roleField?.name;
  return mappedName ?? user.role;
}

function effectiveRoleId(user: UserRow) {
  const roleField = user.user_roles?.[0]?.roles;
  return (Array.isArray(roleField) ? roleField[0]?.id : roleField?.id) ?? "";
}

export default async function AdminUsersPage() {
  const { appUser } = await requirePermission("manage_users");
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, description")
    .order("name");

  const { data: users } = await supabase
    .from("app_users")
    .select("id, name, email, role, is_active, created_at, user_roles(roles(id,name))")
    .eq("organization_id", appUser.organization_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invite User</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Invite by email. User receives an email to set password and join your organization.
        </p>

        <form action={inviteUserAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            name="invitee_name"
            placeholder="Full name"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <input
            type="email"
            name="email"
            placeholder="user@company.com"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <select
            name="role_id"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="">Select role</option>
            {(roles as unknown as RoleRow[] | null)?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Send Invite
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Organization Users</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">User</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(users as unknown as UserRow[] | null)?.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{userName(u)}</td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-3 py-3 text-sm">
                    <form action={assignUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="role_id"
                        defaultValue={effectiveRoleId(u)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      >
                        {(roles as unknown as RoleRow[] | null)?.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:text-slate-200">
                        Update
                      </button>
                    </form>
                    {!effectiveRoleId(u) && (
                      <span className={`role-badge role-${effectiveRole(u)} mt-1`}>{effectiveRole(u)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {u.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <form action={setUserActiveAction}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="is_active" value={u.is_active ? "false" : "true"} />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

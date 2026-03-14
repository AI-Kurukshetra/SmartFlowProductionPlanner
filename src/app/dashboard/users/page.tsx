import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type UserWithRole = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  created_at: string;
  user_roles: { roles: { name: string } | { name: string }[] | null }[] | null;
};

function getDisplayName(user: Pick<UserWithRole, "name" | "email">) {
  return user.name?.trim() || user.email;
}

function getRole(user: UserWithRole) {
  const rolesField = user.user_roles?.[0]?.roles;
  const roleName = Array.isArray(rolesField) ? rolesField[0]?.name : rolesField?.name;
  return roleName ?? user.role;
}

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentUser } = await supabase
    .from("app_users")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .single();

  if (!currentUser?.organization_id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
        Complete onboarding first.
      </div>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Only admin can view organization users.</p>
      </div>
    );
  }

  const { data: users } = await supabase
    .from("app_users")
    .select("id, name, email, role, created_at, user_roles(roles(name))")
    .eq("organization_id", currentUser.organization_id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Who has which role in your organization.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {(users as UserWithRole[] | null)?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(users as UserWithRole[]).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{getDisplayName(u)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`role-badge role-${getRole(u)}`}>{getRole(u)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">No users found.</div>
        )}
      </div>
    </div>
  );
}

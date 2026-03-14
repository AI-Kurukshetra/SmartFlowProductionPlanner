import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type MemberRow = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "planner" | "supervisor" | "operator";
  created_at: string;
  user_roles: { roles: { name: string } | { name: string }[] | null }[] | null;
};

function displayName(member: Pick<MemberRow, "name" | "email">) {
  return member.name?.trim() || member.email;
}

function getEffectiveRole(member: MemberRow) {
  const rolesField = member.user_roles?.[0]?.roles;
  const mappedName = Array.isArray(rolesField) ? rolesField[0]?.name : rolesField?.name;
  return mappedName ?? member.role;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, name, email, role, organization_id, created_at, user_roles(roles(name))")
    .eq("id", user.id)
    .single();

  if (!appUser) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
        Profile not found. Please sign out and sign in again.
      </div>
    );
  }

  const isAdmin = appUser.role === "admin";

  const { data: members } =
    isAdmin && appUser.organization_id
      ? await supabase
          .from("app_users")
          .select("id, name, email, role, created_at, user_roles(roles(name))")
          .eq("organization_id", appUser.organization_id)
          .order("name", { ascending: true })
      : { data: [] };

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Your account details and role visibility.</p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">My Account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{displayName(appUser)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{appUser.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
            <span className={`role-badge role-${getEffectiveRole(appUser as unknown as MemberRow)} mt-1`}>
              {getEffectiveRole(appUser as unknown as MemberRow)}
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Joined</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {new Date(appUser.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {isAdmin ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Organization Users</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {(members as unknown as MemberRow[] | null)?.length ?? 0} users
            </span>
          </div>

          {(members as unknown as MemberRow[] | null)?.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      User
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Role
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(members as unknown as MemberRow[]).map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40">
                      <td className="px-3 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {displayName(member)}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{member.email}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`role-badge role-${getEffectiveRole(member)}`}>{getEffectiveRole(member)}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No users found for this organization.</p>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:shadow-slate-900/50">
          Organization role list is visible to <span className="font-semibold">admin</span> users.
        </section>
      )}
    </div>
  );
}

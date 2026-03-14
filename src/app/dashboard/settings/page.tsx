import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("name, email, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Account and workspace settings.</p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Current User</h2>
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-medium">Name:</span> {appUser?.name ?? user.email}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-medium">Email:</span> {appUser?.email ?? user.email}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-medium">Role:</span>{" "}
            <span className={`role-badge role-${appUser?.role ?? "operator"}`}>{appUser?.role ?? "operator"}</span>
          </p>
        </div>
      </section>
    </div>
  );
}

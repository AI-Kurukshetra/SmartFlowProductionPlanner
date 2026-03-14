import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getEffectiveRoleName } from "@/lib/auth/rbac";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  const effectiveRole = await getEffectiveRoleName(user.id);
  const isAdmin = effectiveRole === "admin";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <DashboardSidebar isAdmin={isAdmin} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium text-slate-700 hover:text-violet-700 dark:text-slate-200 dark:hover:text-violet-300"
            >
              {appUser?.name ?? user.email}
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              {(appUser?.name ?? user.email)?.[0]?.toUpperCase() ?? "U"}
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 dark:bg-slate-900">{children}</main>
      </div>
    </div>
  );
}

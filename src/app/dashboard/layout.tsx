import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";

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
    .single();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-800">
            Smart Product Planner
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-800">
              Dashboard
            </Link>
            <Link href="/dashboard/plants" className="text-sm text-slate-600 hover:text-slate-800">
              Plants
            </Link>
            <Link href="/dashboard/resources" className="text-sm text-slate-600 hover:text-slate-800">
              Resources
            </Link>
            <Link href="/dashboard/products" className="text-sm text-slate-600 hover:text-slate-800">
              Products
            </Link>
            <Link href="/dashboard/boms" className="text-sm text-slate-600 hover:text-slate-800">
              BOMs
            </Link>
            <Link href="/dashboard/work-orders" className="text-sm text-slate-600 hover:text-slate-800">
              Work orders
            </Link>
            <Link href="/dashboard/scheduler" className="text-sm text-slate-600 hover:text-slate-800">
              Scheduler
            </Link>
            <Link href="/dashboard/inventory" className="text-sm text-slate-600 hover:text-slate-800">
              Inventory
            </Link>
            <Link href="/dashboard/reports" className="text-sm text-slate-600 hover:text-slate-800">
              Reports
            </Link>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <span className="text-sm text-slate-600">{appUser?.name ?? user.email}</span>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 capitalize">
                {appUser?.role ?? "operator"}
              </span>
              <SignOutButton />
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl">{children}</main>
    </div>
  );
}

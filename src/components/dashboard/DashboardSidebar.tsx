"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/plants", label: "Plants" },
  { href: "/dashboard/resources", label: "Resources" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/boms", label: "BOMs" },
  { href: "/dashboard/work-orders", label: "Work Orders" },
  { href: "/dashboard/scheduler", label: "Scheduler" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles & Permissions" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-gradient-to-b from-violet-700 to-violet-800 shadow-xl dark:from-violet-900 dark:to-violet-950">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Smart Product</p>
          <p className="text-xs text-violet-200">Planner</p>
        </div>
      </div>
      <p className="px-6 pb-2 text-xs font-medium uppercase tracking-wider text-violet-300">Menu</p>
      <nav className="flex flex-1 flex-col gap-0.5 px-4 pb-6">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-violet-600/80 text-white shadow-lg"
                  : "text-violet-100 hover:bg-violet-600/40 hover:text-white"
              }`}
            >
              {isActive && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              )}
              {!isActive && <span className="h-2 w-2 shrink-0 rounded-full bg-transparent" />}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

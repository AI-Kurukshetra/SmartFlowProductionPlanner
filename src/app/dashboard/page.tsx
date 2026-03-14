import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("name, role, organization_id")
    .eq("id", user.id)
    .single();

  const { data: org } = appUser?.organization_id
    ? await supabase
        .from("organizations")
        .select("name")
        .eq("id", appUser.organization_id)
        .single()
    : { data: null };

  const { data: plants } = appUser?.organization_id
    ? await supabase
        .from("plants")
        .select("id, name")
        .eq("organization_id", appUser.organization_id)
    : { data: [] };

  const plantCount = plants?.length ?? 0;
  const throughput = Math.min(98, 62 + plantCount * 6);
  const scheduleHealth = Math.max(54, 88 - plantCount * 3);
  const liveOrders = 14 + plantCount * 2;
  const inventoryAlerts = plantCount === 0 ? 0 : Math.max(1, Math.floor(plantCount / 2));

  return (
    <div className="relative overflow-hidden px-6 py-8">
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

      <section className="relative rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-teal-700">
              Operations overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Control Tower</h1>
            <p className="mt-2 text-slate-600">Welcome to {org?.name ?? "your organization"}</p>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
              <p className="text-xs text-slate-500">Live work orders</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{liveOrders}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
              <p className="text-xs text-slate-500">Inventory alerts</p>
              <p className="mt-1 text-2xl font-semibold text-rose-600">{inventoryAlerts}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Plants</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{plantCount}</p>
          <p className="mt-1 text-sm text-slate-500">Configured manufacturing sites</p>
        </article>
        <article className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Throughput</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{throughput}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${throughput}%` }}
            />
          </div>
        </article>
        <article className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Schedule health</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-700">{scheduleHealth}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cyan-600 transition-all duration-700"
              style={{ width: `${scheduleHealth}%` }}
            />
          </div>
        </article>
        <article className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
          <p className="mt-2 text-2xl font-semibold capitalize text-slate-900">{appUser?.role ?? "operator"}</p>
          <p className="mt-1 text-sm text-slate-500">Current permission scope</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            <span className="text-xs text-slate-500">Interactive shortcuts</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/products"
              className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-400 hover:bg-teal-50"
            >
              <h3 className="font-medium text-slate-900 transition group-hover:text-teal-700">Products</h3>
              <p className="mt-1 text-sm text-slate-600">Define SKUs and BOM structures</p>
            </Link>
            <Link
              href="/dashboard/work-orders"
              className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-400 hover:bg-teal-50"
            >
              <h3 className="font-medium text-slate-900 transition group-hover:text-teal-700">Work orders</h3>
              <p className="mt-1 text-sm text-slate-600">Create and release production orders</p>
            </Link>
            <Link
              href="/dashboard/scheduler"
              className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-400 hover:bg-teal-50"
            >
              <h3 className="font-medium text-slate-900 transition group-hover:text-teal-700">Scheduler</h3>
              <p className="mt-1 text-sm text-slate-600">Balance load across resources</p>
            </Link>
            <Link
              href="/dashboard/inventory"
              className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-400 hover:bg-teal-50"
            >
              <h3 className="font-medium text-slate-900 transition group-hover:text-teal-700">Inventory</h3>
              <p className="mt-1 text-sm text-slate-600">Monitor stock and shortages</p>
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Live Ops Pulse</h2>
          <div className="mt-5 flex items-center gap-4">
            <div
              className="grid h-20 w-20 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#0d9488 ${throughput}%, #e2e8f0 ${throughput}% 100%)`,
              }}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-sm font-semibold text-slate-800">
                {throughput}%
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Overall line utilization is stable with room for optimization in changeover windows.
            </p>
          </div>

          <ul className="mt-5 space-y-3 text-sm">
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              Line A setup completed 12 min ahead of plan
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              Material request MR-217 flagged for low stock
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              Scheduler recalculated queue after priority update
            </li>
          </ul>
        </aside>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-900">Your plants</h2>
          {plants?.length ? (
            <ul className="mt-4 space-y-3">
              {plants.map((p, index) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {index % 2 === 0 ? "Running" : "Planned"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No plants configured yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-900">Recent activity</h2>
          <div className="mt-4 space-y-4">
            <div className="border-l-2 border-teal-500 pl-4">
              <p className="text-sm font-medium text-slate-700">Onboarding checkpoint completed</p>
              <p className="text-xs text-slate-500">Organization setup confirmed</p>
            </div>
            <div className="border-l-2 border-cyan-500 pl-4">
              <p className="text-sm font-medium text-slate-700">Schedule simulation generated</p>
              <p className="text-xs text-slate-500">Capacity profile updated for this week</p>
            </div>
            <div className="border-l-2 border-amber-500 pl-4">
              <p className="text-sm font-medium text-slate-700">Inventory variance detected</p>
              <p className="text-xs text-slate-500">Review shortages before releasing new orders</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

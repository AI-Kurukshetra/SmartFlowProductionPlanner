import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const FLOW_STEPS = [
  { label: "Products", href: "/dashboard/products", desc: "Define SKUs and product catalog" },
  { label: "BOM", href: "/dashboard/boms", desc: "Materials required per product" },
  { label: "Inventory", href: "/dashboard/inventory", desc: "Stock levels & low stock alerts" },
  { label: "Work Orders", href: "/dashboard/work-orders", desc: "Production orders to fulfill" },
  { label: "Operations", href: "/dashboard/work-orders", desc: "Steps within each work order" },
  { label: "Scheduling", href: "/dashboard/scheduler", desc: "Assign to resources & time slots" },
  { label: "Production", href: "/dashboard/production", desc: "Runs & production_logs" },
  { label: "Production Tracking", href: "/dashboard/reports", desc: "Track progress & KPIs" },
];

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

  const { data: products } = appUser?.organization_id
    ? await supabase
        .from("products")
        .select("id, name")
        .eq("organization_id", appUser.organization_id)
    : { data: [] };

  const productIds = (products ?? []).map((p) => p.id);
  const { data: workOrders } =
    appUser?.organization_id && productIds.length > 0
      ? await supabase.from("work_orders").select("id").in("product_id", productIds)
      : { data: [] };

  const plantIds = (plants ?? []).map((p) => p.id);
  const { data: inventory } =
    appUser?.organization_id && plantIds.length > 0
      ? await supabase
          .from("inventory")
          .select("id, material_name, quantity, unit")
          .in("plant_id", plantIds)
      : { data: [] };

  const LOW_STOCK_THRESHOLD = 10;
  const lowStockItems = (inventory ?? []).filter((i) => Number(i.quantity) < LOW_STOCK_THRESHOLD);

  const plantCount = plants?.length ?? 0;
  const productCount = products?.length ?? 0;
  const orderCount = workOrders?.length ?? 0;
  const inventoryCount = inventory?.length ?? 0;
  const throughput = plantCount > 0 ? Math.min(98, 62 + plantCount * 8) : 0;

  const topProducts = (products ?? []).slice(0, 10);
  const barHeights = [65, 85, 45, 90, 70, 55];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Plants</p>
          <p className="mt-2 text-3xl font-bold text-amber-500">{plantCount}</p>
          <Link href="/dashboard/plants" className="mt-1 inline-block text-sm text-amber-600 hover:text-amber-700">
            View →
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Products</p>
          <p className="mt-2 text-3xl font-bold text-violet-600">{productCount}</p>
          <Link href="/dashboard/products" className="mt-1 inline-block text-sm text-violet-600 hover:text-violet-700">
            View →
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Work Orders</p>
          <p className="mt-2 text-3xl font-bold text-rose-500">{orderCount}</p>
          <Link href="/dashboard/work-orders" className="mt-1 inline-block text-sm text-rose-600 hover:text-rose-700">
            View →
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Inventory</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{inventoryCount}</p>
          <Link href="/dashboard/inventory" className="mt-1 inline-block text-sm text-emerald-600 hover:text-emerald-700">
            View →
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Throughput</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{throughput}%</p>
          <Link href="/dashboard/reports" className="mt-1 inline-block text-sm text-blue-600 hover:text-blue-700">
            Reports →
          </Link>
        </div>
      </section>

      {/* Production Flow + Charts Row */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Production Flow Graphic */}
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Production Flow</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{org?.name ?? "Your organization"}</p>
          <div className="mt-6 flex h-48 items-end justify-between gap-2">
            {[70, 85, 60, 90, 75, 95, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-violet-500 to-rose-400 transition-all hover:from-violet-600 hover:to-rose-500"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Top Products</h2>
          <ul className="mt-4 space-y-3">
            {topProducts.length ? (
              topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">#{String(i + 1).padStart(2, "0")} {p.name}</span>
                  <Link href="/dashboard/products" className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600">
                    View
                  </Link>
                </li>
              ))
            ) : (
              <li className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">No products yet</li>
            )}
          </ul>
        </div>
      </section>

      {/* Growth + Activity Row */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Growth Bar Chart */}
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Growth</h2>
          <div className="mt-6 flex h-32 items-end justify-between gap-2">
            {barHeights.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, hsl(${220 + i * 20}, 70%, 55%), hsl(${220 + i * 20}, 70%, 70%))`,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            {["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"].map((q) => (
              <span key={q}>{q}</span>
            ))}
          </div>
        </div>

        {/* Resource Utilization Donuts */}
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Utilization</h2>
          <div className="mt-4 flex justify-around">
            {[
              { pct: 75, color: "#8b5cf6", label: "Line A" },
              { pct: 50, color: "#f59e0b", label: "Line B" },
              { pct: 60, color: "#3b82f6", label: "Line C" },
            ].map(({ pct, color, label }) => (
              <div key={label} className="flex flex-col items-center">
                <div
                  className="relative h-16 w-16 rounded-full"
                  style={{
                    background: `conic-gradient(${color} ${pct}%, #e2e8f0 ${pct}% 100%)`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-800" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                    {pct}%
                  </span>
                </div>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed - Inventory alerts from real data */}
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Activity</h2>
          <ul className="mt-4 space-y-3">
            {lowStockItems.length > 0 ? (
              lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    href="/dashboard/inventory"
                    className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 transition hover:border-amber-200 hover:bg-amber-50/50 dark:border-slate-700 dark:hover:border-amber-800 dark:hover:bg-amber-900/10"
                  >
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">[Inventory]</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Low stock: {item.material_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.quantity} {item.unit} remaining</p>
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">[Inventory]</span>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">All stock levels OK</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">No low stock alerts</p>
                </div>
              </li>
            )}
          </ul>
          <Link href="/dashboard/inventory" className="mt-3 inline-block text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
            View inventory →
          </Link>
        </div>
      </section>

      {/* Production Flow Steps */}
      <section className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Real Production Flow</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manufacturing systems work like this</p>
        <div className="mt-6 flex flex-wrap gap-4">
          {FLOW_STEPS.map((step, i) => (
            <Link
              key={step.label}
              href={step.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-3 transition hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-700/50 dark:hover:border-violet-600 dark:hover:bg-violet-900/30"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-semibold text-violet-700 group-hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:group-hover:bg-violet-800/50">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{step.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
              </div>
              <span className="text-violet-500 opacity-0 transition group-hover:opacity-100">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

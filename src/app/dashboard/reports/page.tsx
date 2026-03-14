import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const { data: kpis } = appUser?.organization_id
    ? await supabase
        .from("kpis")
        .select("id, name, value, recorded_at")
        .eq("organization_id", appUser.organization_id)
        .order("recorded_at", { ascending: false })
        .limit(20)
    : { data: [] };

  let woCount = 0;
  let productIds: { id: string }[] = [];
  if (appUser?.organization_id) {
    const { data: pids } = await supabase.from("products").select("id").eq("organization_id", appUser.organization_id);
    productIds = pids ?? [];
    const ids = productIds.map((p) => p.id);
    if (ids.length > 0) {
      const { count } = await supabase.from("work_orders").select("id", { count: "exact", head: true }).in("product_id", ids);
      woCount = count ?? 0;
    }
  }

  const ids = productIds.map((p) => p.id);
  const { data: workOrders } = ids.length > 0
    ? await supabase.from("work_orders").select("id").in("product_id", ids)
    : { data: [] };
  const woIds = (workOrders ?? []).map((w) => w.id);

  const { data: productionRuns } = woIds.length > 0
    ? await supabase
        .from("production_runs")
        .select(`
          id, work_order_id, produced_quantity, start_time, end_time,
          work_orders(product:products(name))
        `)
        .in("work_order_id", woIds)
        .order("start_time", { ascending: false })
        .limit(20)
    : { data: [] };

  const runIds = (productionRuns ?? []).map((r) => r.id);
  const { data: productionLogs } = runIds.length > 0
    ? await supabase
        .from("production_logs")
        .select("id, production_run_id, event, created_at")
        .in("production_run_id", runIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      <p className="mt-1 text-slate-600">KPI metrics and analytics</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Dashboard</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Control Tower</p>
          <p className="mt-1 text-sm text-slate-500">Overview and quick actions</p>
        </Link>
        <Link href="/dashboard/work-orders" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Work orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{woCount}</p>
          <p className="mt-1 text-sm text-slate-500">Production orders</p>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stored KPIs</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{kpis?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Recorded metrics</p>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-medium text-slate-900">Recent KPIs</h2>
        {kpis?.length ? (
          <ul className="mt-4 space-y-3">
            {kpis.map((k: { id: string; name: string; value: number; recorded_at: string }) => (
              <li key={k.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <span className="font-medium text-slate-800">{k.name}</span>
                <span className="text-slate-600">{k.value}</span>
                <span className="text-xs text-slate-500">{new Date(k.recorded_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No KPI records yet. KPIs are recorded from production tracking.</p>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Production runs</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Created when work orders start (in_progress)</p>
        {productionRuns?.length ? (
          <ul className="mt-4 space-y-3">
            {productionRuns.map((r: { id: string; work_order_id: string; produced_quantity: number; start_time: string; end_time: string | null; work_orders?: { product?: { name?: string } } }) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {(r.work_orders as { product?: { name?: string } })?.product?.name ?? "Work order"}
                  </span>
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                    {r.produced_quantity} produced
                  </span>
                </div>
                <div className="text-right text-sm text-slate-600 dark:text-slate-400">
                  <div>{new Date(r.start_time).toLocaleString()} – {r.end_time ? new Date(r.end_time).toLocaleString() : "running"}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No production runs yet. Start a work order to begin tracking.</p>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Production logs</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Events: started, completed</p>
        {productionLogs?.length ? (
          <ul className="mt-4 space-y-2">
            {productionLogs.map((l: { id: string; event: string; created_at: string }) => (
              <li key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2 dark:border-slate-700">
                <span className="font-medium text-slate-700 dark:text-slate-200">{l.event}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No logs yet. Logs are created when work orders start or complete.</p>
        )}
      </section>
    </div>
  );
}

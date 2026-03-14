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
  if (appUser?.organization_id) {
    const { data: productIds } = await supabase.from("products").select("id").eq("organization_id", appUser.organization_id);
    const ids = productIds?.map((p) => p.id) ?? [];
    if (ids.length > 0) {
      const { count } = await supabase.from("work_orders").select("id", { count: "exact", head: true }).in("product_id", ids);
      woCount = count ?? 0;
    }
  }

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
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SchedulerPage() {
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

  const { data: schedules } = appUser?.organization_id
    ? await supabase
        .from("schedules")
        .select(`
          id, start_time, end_time, status,
          work_orders(products(name)),
          resources(name, work_centers(name))
        `)
        .order("start_time")
    : { data: [] };

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Scheduler</h1>
      <p className="mt-1 text-slate-600">Production schedule and resource allocation</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        {schedules?.length ? (
          <ul className="divide-y divide-slate-200">
            {schedules.map((s: { id: string; start_time: string; end_time: string; status: string; work_orders?: { products?: { name: string } }; resources?: { name: string; work_centers?: { name: string } } }) => (
              <li key={s.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-slate-800">{s.work_orders?.products?.name ?? "Work order"}</p>
                  <p className="text-sm text-slate-500">{s.resources?.name} • {s.resources?.work_centers?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {new Date(s.start_time).toLocaleString()} – {new Date(s.end_time).toLocaleString()}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    s.status === "in_progress" ? "bg-cyan-100 text-cyan-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {s.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            No schedules yet. Create work orders and assign to resources.
          </div>
        )}
      </div>
    </div>
  );
}

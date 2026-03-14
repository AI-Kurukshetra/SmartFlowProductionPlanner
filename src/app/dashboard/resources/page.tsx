import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ResourcesPage() {
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

  const { data: resources } = appUser?.organization_id
    ? await supabase
        .from("resources")
        .select("id, name, type, capacity, status, work_center_id")
        .order("name")
    : { data: [] };

  const workCenterIds = [...new Set((resources ?? []).map((r) => r.work_center_id))];
  const { data: workCenters } = workCenterIds.length
    ? await supabase.from("work_centers").select("id, name, plant_id").in("id", workCenterIds)
    : { data: [] };
  const { data: plants } = workCenters?.length
    ? await supabase.from("plants").select("id, name").in("id", workCenters.map((wc) => wc.plant_id))
    : { data: [] };

  const wcMap = Object.fromEntries((workCenters ?? []).map((wc) => [wc.id, wc]));
  const plantMap = Object.fromEntries((plants ?? []).map((p) => [p.id, p]));

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Resources</h1>
      <p className="mt-1 text-slate-600">Machines and manufacturing resources</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        {(resources ?? []).length ? (
          <ul className="divide-y divide-slate-200">
            {(resources ?? []).map((r) => {
              const wc = wcMap[r.work_center_id];
              const plant = wc ? plantMap[wc.plant_id] : null;
              return (
              <li key={r.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-slate-800">{r.name}</p>
                  <p className="text-sm text-slate-500">
                    {plant?.name} → {wc?.name}
                    {r.type && ` • ${r.type}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">Capacity: {r.capacity}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {r.status}
                  </span>
                </div>
              </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            No resources yet. Add work centers and resources in onboarding.
          </div>
        )}
      </div>
    </div>
  );
}

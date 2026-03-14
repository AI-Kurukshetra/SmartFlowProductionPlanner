import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PlantsPage() {
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

  const { data: plants } = appUser?.organization_id
    ? await supabase
        .from("plants")
        .select("id, name, code, address")
        .eq("organization_id", appUser.organization_id)
        .order("name")
    : { data: [] };

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Plants</h1>
      </div>
      <p className="mt-1 text-slate-600">Manage manufacturing plants and facilities</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        {plants?.length ? (
          <ul className="divide-y divide-slate-200">
            {plants.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-slate-800">{p.name}</p>
                  {p.code && <p className="text-sm text-slate-500">Code: {p.code}</p>}
                  {p.address && <p className="text-sm text-slate-500">{p.address}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            No plants yet. Add plants during onboarding or from the dashboard.
          </div>
        )}
      </div>
    </div>
  );
}

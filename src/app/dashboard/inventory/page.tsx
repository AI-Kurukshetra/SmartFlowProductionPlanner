import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InventoryPage() {
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

  const { data: inventory } = appUser?.organization_id
    ? await supabase
        .from("inventory")
        .select(`
          id, material_name, quantity, unit,
          plants(name)
        `)
        .order("material_name")
    : { data: [] };

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
      <p className="mt-1 text-slate-600">Raw materials and stock levels</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        {inventory?.length ? (
          <ul className="divide-y divide-slate-200">
            {inventory.map((i: { id: string; material_name: string; quantity: number; unit: string; plants?: { name: string } }) => (
              <li key={i.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-slate-800">{i.material_name}</p>
                  <p className="text-sm text-slate-500">{i.plants?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${Number(i.quantity) < 10 ? "text-rose-600" : "text-slate-800"}`}>
                    {i.quantity} {i.unit}
                  </span>
                  {Number(i.quantity) < 10 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Low stock</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            No inventory records yet. Add materials to plants.
          </div>
        )}
      </div>
    </div>
  );
}

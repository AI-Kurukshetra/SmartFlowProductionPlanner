import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BOMsPage() {
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

  const { data: boms } = appUser?.organization_id
    ? await supabase
        .from("boms")
        .select(`
          id, version,
          products(id, name, sku)
        `)
        .order("version", { ascending: false })
    : { data: [] };

  const { data: bomItems } = boms?.length
    ? await supabase.from("bom_items").select("bom_id, material_name, quantity, unit")
    : { data: [] };

  const itemsByBom = (bomItems ?? []).reduce(
    (acc: Record<string, { material_name: string; quantity: number; unit: string }[]>, item: { bom_id: string; material_name: string; quantity: number; unit: string }) => {
      if (!acc[item.bom_id]) acc[item.bom_id] = [];
      acc[item.bom_id].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">BOMs</h1>
      <p className="mt-1 text-slate-600">Bill of materials for products</p>

      <div className="mt-6 space-y-6">
        {boms?.length ? (
          boms.map((b: { id: string; version: number; products?: { name: string; sku?: string } }) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-800">{b.products?.name ?? "Product"}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">v{b.version}</span>
              </div>
              <ul className="mt-4 space-y-2 pl-4">
                {(itemsByBom[b.id] ?? []).map((item, i) => (
                  <li key={i} className="text-sm text-slate-600">
                    ├ {item.material_name} × {item.quantity} {item.unit}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
            No BOMs yet. Create products first, then add BOMs.
          </div>
        )}
      </div>
    </div>
  );
}

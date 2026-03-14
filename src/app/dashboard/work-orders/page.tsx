import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WorkOrdersPage() {
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

  const { data: workOrders } = appUser?.organization_id
    ? await supabase
        .from("work_orders")
        .select(`
          id, quantity, status, priority, due_date, created_at,
          products(name, sku)
        `)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Work orders</h1>
      <p className="mt-1 text-slate-600">Production orders and operations</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        {workOrders?.length ? (
          <ul className="divide-y divide-slate-200">
            {workOrders.map((wo: { id: string; quantity: number; status: string; priority: number; due_date?: string; products?: { name: string; sku?: string } }) => (
              <li key={wo.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-slate-800">{wo.products?.name ?? "Product"}</p>
                  <p className="text-sm text-slate-500">Qty: {wo.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  {wo.due_date && <span className="text-sm text-slate-500">Due: {wo.due_date}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    wo.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    wo.status === "in_progress" ? "bg-cyan-100 text-cyan-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {wo.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            No work orders yet. Create work orders from products.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { WorkOrderModal, type WorkOrderFormData } from "@/components/work-orders/WorkOrderModal";

interface Product {
  id: string;
  name: string;
}

interface WorkOrder {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  priority: number;
  due_date: string | null;
  product?: { name: string; sku?: string };
}

export default function WorkOrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<(WorkOrder & WorkOrderFormData) | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: appUser } = await supabase
      .from("app_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!appUser?.organization_id) {
      setProducts([]);
      setWorkOrders([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data: prods } = await supabase
      .from("products")
      .select("id, name")
      .eq("organization_id", appUser.organization_id)
      .order("name");
    setProducts(prods ?? []);

    const productIds = (prods ?? []).map((p) => p.id);
    const { data: orders } =
      productIds.length > 0
        ? await supabase
            .from("work_orders")
            .select("id, product_id, quantity, status, priority, due_date, product:products(name, sku)")
            .in("product_id", productIds)
            .order("created_at", { ascending: false })
        : { data: [] };
    setWorkOrders(orders ?? []);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: WorkOrderFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingOrder) {
      const { error } = await supabase
        .from("work_orders")
        .update({
          quantity: data.quantity,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date || null,
        })
        .eq("id", editingOrder.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("work_orders").insert({
        product_id: data.product_id,
        quantity: data.quantity,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || null,
      });

      if (error) throw error;
    }

    setEditingOrder(null);
    await fetchData();
  }

  async function handleStatusUpdate(id: string, newStatus: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("work_orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    const now = new Date().toISOString();

    if (newStatus === "in_progress") {
      const { data: run, error: runErr } = await supabase
        .from("production_runs")
        .insert({
          work_order_id: id,
          produced_quantity: 0,
          start_time: now,
        })
        .select("id")
        .single();

      if (!runErr && run) {
        await supabase.from("production_logs").insert({
          production_run_id: run.id,
          event: "started",
        });
      }
    } else if (newStatus === "completed") {
      const { data: runs } = await supabase
        .from("production_runs")
        .select("id")
        .eq("work_order_id", id)
        .is("end_time", null);

      const run = runs?.[0];
      if (run) {
        const wo = workOrders.find((o) => o.id === id);
        await supabase
          .from("production_runs")
          .update({ end_time: now, produced_quantity: wo?.quantity ?? 0 })
          .eq("id", run.id);

        await supabase.from("production_logs").insert({
          production_run_id: run.id,
          event: "completed",
        });
      }
    }

    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this work order?")) return;

    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    setEditingOrder(null);
    await fetchData();
  }

  function openCreateModal() {
    setEditingOrder(null);
    setModalOpen(true);
  }

  function openEditModal(order: WorkOrder) {
    setEditingOrder({
      ...order,
      product_id: order.product_id,
      quantity: order.quantity,
      status: order.status,
      priority: order.priority,
      due_date: order.due_date ?? "",
    });
    setModalOpen(true);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    in_progress: "bg-cyan-100 text-cyan-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
  };

  if (!supabase) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-800">Supabase not configured.</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Work orders</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Production orders and operations</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!orgId || products.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create order
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : workOrders.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {workOrders.map((wo) => (
              <li
                key={wo.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {(wo.product as { name?: string })?.name ?? "Product"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Qty: {wo.quantity}
                    {wo.due_date && ` • Due: ${wo.due_date}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={wo.status}
                    onChange={(e) => handleStatusUpdate(wo.id, e.target.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                      statusColors[wo.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => openEditModal(wo)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(wo.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {products.length === 0
                ? "Create products first, then create work orders."
                : "No work orders yet."}
            </p>
            {products.length > 0 && (
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Create your first work order
              </button>
            )}
          </div>
        )}
      </div>

      <WorkOrderModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSave}
        products={products}
        order={editingOrder}
      />
    </div>
  );
}

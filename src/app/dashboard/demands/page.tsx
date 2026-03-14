"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { DemandModal, type DemandFormData } from "@/components/demands/DemandModal";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
}

interface Demand {
  id: string;
  product_id: string;
  quantity: number;
  due_date: string;
  status: string;
  source: string;
  notes: string | null;
  work_order_id: string | null;
  product?: { name: string } | { name: string }[];
}

export default function DemandsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<(Demand & DemandFormData) | null>(null);
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
      setDemands([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data: prodData } = await supabase
      .from("products")
      .select("id, name")
      .eq("organization_id", appUser.organization_id)
      .order("name");
    setProducts(prodData ?? []);

    const { data: demData } = await supabase
      .from("demands")
      .select("id, product_id, quantity, due_date, status, source, notes, work_order_id, product:products(name)")
      .eq("organization_id", appUser.organization_id)
      .order("due_date", { ascending: true });
    setDemands((demData ?? []) as unknown as Demand[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: DemandFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingDemand) {
      const { error } = await supabase
        .from("demands")
        .update({
          quantity: data.quantity,
          due_date: data.due_date,
          status: data.status,
          source: data.source,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingDemand.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("demands").insert({
        organization_id: orgId,
        product_id: data.product_id,
        quantity: data.quantity,
        due_date: data.due_date,
        status: data.status,
        source: data.source,
        notes: data.notes || null,
      });

      if (error) throw error;
    }

    setEditingDemand(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this demand?")) return;

    const { error } = await supabase.from("demands").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingDemand(null);
    await fetchData();
  }

  const openDemands = demands.filter((d) => d.status === "open");

  if (!supabase) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        Supabase not configured.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Demands</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Customer orders and forecasts — create work orders to fulfill
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDemand(null);
            setModalOpen(true);
          }}
          disabled={!orgId || products.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add demand
        </button>
      </div>

      {openDemands.length > 0 && (
        <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
          <h2 className="text-sm font-semibold text-violet-800 dark:text-violet-200">
            Open demands ({openDemands.length})
          </h2>
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
            Create work orders from these demands to start production planning.
          </p>
          <Link
            href="/dashboard/work-orders"
            className="mt-3 inline-block text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
          >
            Go to Work Orders →
          </Link>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : demands.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {demands.map((d) => {
              const productName = (d.product as { name?: string })?.name ?? "Product";
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {productName} × {d.quantity}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Due {d.due_date} — {d.source.replace(/_/g, " ")} — {d.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.work_order_id && (
                      <Link
                        href="/dashboard/work-orders"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-300"
                      >
                        Linked WO
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setEditingDemand({
                          ...d,
                          product_id: d.product_id,
                          quantity: d.quantity,
                          due_date: d.due_date,
                          status: d.status,
                          source: d.source,
                          notes: d.notes ?? "",
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {products.length === 0 ? "Add products first, then add demands." : "No demands yet."}
            </p>
            {products.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Add your first demand
              </button>
            )}
          </div>
        )}
      </div>

      <DemandModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDemand(null);
        }}
        onSave={handleSave}
        products={products}
        item={editingDemand}
      />
    </div>
  );
}

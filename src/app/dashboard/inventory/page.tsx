"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { InventoryModal, type InventoryFormData } from "@/components/inventory/InventoryModal";
import Link from "next/link";

const LOW_STOCK_THRESHOLD = 10;

interface Plant {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  plant_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  plant?: { name: string } | { name: string }[];
}

export default function InventoryPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(InventoryItem & InventoryFormData) | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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
      setPlants([]);
      setInventory([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data: plantsData } = await supabase
      .from("plants")
      .select("id, name")
      .eq("organization_id", appUser.organization_id)
      .order("name");
    setPlants(plantsData ?? []);

    const { data: invData } = await supabase
      .from("inventory")
      .select("id, plant_id, material_name, quantity, unit, plant:plants(name)")
      .order("material_name");
    setInventory((invData ?? []) as unknown as InventoryItem[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: InventoryFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingItem) {
      const { error } = await supabase
        .from("inventory")
        .update({
          quantity: data.quantity,
          unit: data.unit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingItem.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("inventory").insert({
        plant_id: data.plant_id,
        material_name: data.material_name,
        quantity: data.quantity,
        unit: data.unit,
      });

      if (error) throw error;
    }

    setEditingItem(null);
    await fetchData();
  }

  async function handleStockUpdate(id: string, newQuantity: number) {
    if (!supabase) return;
    setUpdatingId(id);

    const { error } = await supabase
      .from("inventory")
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq("id", id);

    setUpdatingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this inventory record?")) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingItem(null);
    await fetchData();
  }

  const lowStockItems = inventory.filter((i) => Number(i.quantity) < LOW_STOCK_THRESHOLD);

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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Inventory</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Raw materials, stock levels & low stock alerts</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          disabled={!orgId || plants.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add material
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Low stock alert</h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {lowStockItems.length} material{lowStockItems.length > 1 ? "s" : ""} below {LOW_STOCK_THRESHOLD} units
          </p>
          <ul className="mt-2 space-y-1">
            {lowStockItems.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-800 dark:text-amber-200">{i.material_name}</span>
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {i.quantity} {i.unit}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="#inventory-list"
            className="mt-3 inline-block text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
          >
            Update stock →
          </Link>
        </div>
      )}

      <div id="inventory-list" className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : inventory.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {inventory.map((i) => {
              const isLow = Number(i.quantity) < LOW_STOCK_THRESHOLD;
              const plantName = (i.plant as { name?: string })?.name ?? "Plant";
              return (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{i.material_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{plantName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={i.quantity}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v) && v !== Number(i.quantity)) {
                            handleStockUpdate(i.id, v);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        disabled={updatingId === i.id}
                        className={`w-24 rounded-lg border px-3 py-1.5 text-right text-sm font-medium focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:bg-slate-700 dark:text-slate-100 ${
                          isLow ? "border-rose-300 dark:border-rose-700" : "border-slate-300 dark:border-slate-600"
                        }`}
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">{i.unit}</span>
                    </div>
                    {isLow && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                        Low stock
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setEditingItem({
                          ...i,
                          plant_id: i.plant_id,
                          material_name: i.material_name,
                          quantity: i.quantity,
                          unit: i.unit,
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i.id)}
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
              {plants.length === 0
                ? "Add plants first (onboarding or Plants page), then add materials."
                : "No inventory yet."}
            </p>
            {plants.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Add your first material
              </button>
            )}
          </div>
        )}
      </div>

      <InventoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        plants={plants}
        item={editingItem}
      />
    </div>
  );
}

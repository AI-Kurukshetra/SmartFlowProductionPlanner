"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BOMModal, type BOMItemForm } from "@/components/boms/BOMModal";

interface Product {
  id: string;
  name: string;
}

interface BOM {
  id: string;
  product_id: string;
  version: number;
  products?: { name: string; sku?: string } | { name: string; sku?: string }[];
}

interface BOMItem {
  id: string;
  bom_id: string;
  material_name: string;
  quantity: number;
  unit: string;
}

export default function BOMsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [itemsByBom, setItemsByBom] = useState<Record<string, BOMItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<{ id: string; product_id: string; version: number; items: BOMItemForm[] } | null>(null);
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
      setBoms([]);
      setItemsByBom({});
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

    const { data: bomsData } = await supabase
      .from("boms")
      .select("id, product_id, version, products(id, name, sku)")
      .order("version", { ascending: false });
    setBoms(bomsData ?? []);

    const bomIds = (bomsData ?? []).map((b: BOM) => b.id);
    if (bomIds.length > 0) {
      const { data: items } = await supabase
        .from("bom_items")
        .select("id, bom_id, material_name, quantity, unit")
        .in("bom_id", bomIds);
      const byBom = (items ?? []).reduce<Record<string, BOMItem[]>>((acc: Record<string, BOMItem[]>, item: BOMItem) => {
        if (!acc[item.bom_id]) acc[item.bom_id] = [];
        acc[item.bom_id].push(item);
        return acc;
      }, {});
      setItemsByBom(byBom);
    } else {
      setItemsByBom({});
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(productId: string, version: number, items: BOMItemForm[], bomId?: string) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingBom && bomId) {
      const { error: updateError } = await supabase
        .from("boms")
        .update({ version, updated_at: new Date().toISOString() })
        .eq("id", bomId);
      if (updateError) throw updateError;

      await supabase.from("bom_items").delete().eq("bom_id", bomId);

      const newItems = items.map((i) => ({
        bom_id: bomId,
        material_name: i.material_name,
        quantity: i.quantity,
        unit: i.unit,
      }));
      const { error: insertError } = await supabase.from("bom_items").insert(newItems);
      if (insertError) throw insertError;
    } else {
      const { data: newBom, error: bomError } = await supabase
        .from("boms")
        .insert({ product_id: productId, version })
        .select("id")
        .single();
      if (bomError) throw bomError;

      const newItems = items.map((i) => ({
        bom_id: newBom.id,
        material_name: i.material_name,
        quantity: i.quantity,
        unit: i.unit,
      }));
      const { error: itemsError } = await supabase.from("bom_items").insert(newItems);
      if (itemsError) throw itemsError;
    }

    setEditingBom(null);
    await fetchData();
  }

  async function handleDelete(bomId: string) {
    if (!supabase) return;
    if (!confirm("Delete this BOM and all its materials?")) return;

    const { error } = await supabase.from("boms").delete().eq("id", bomId);
    if (error) {
      alert(error.message);
      return;
    }

    setEditingBom(null);
    await fetchData();
  }

  function openCreateModal() {
    setEditingBom(null);
    setModalOpen(true);
  }

  function openEditModal(bom: BOM) {
    const items = (itemsByBom[bom.id] ?? []).map((i) => ({
      id: i.id,
      material_name: i.material_name,
      quantity: i.quantity,
      unit: i.unit,
    }));
    setEditingBom({
      id: bom.id,
      product_id: bom.product_id,
      version: bom.version,
      items: items.length ? items : [{ material_name: "", quantity: 1, unit: "ea" }],
    });
    setModalOpen(true);
  }

  if (!supabase) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-800">Supabase not configured.</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">BOMs</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Bill of materials for products</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!orgId || products.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create BOM
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500 shadow-md dark:bg-slate-800 dark:text-slate-400 dark:shadow-slate-900/50">
            Loading...
          </div>
        ) : boms.length ? (
          boms.map((bom) => (
            <div
              key={bom.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-slate-800 dark:text-slate-200">
                    {(bom.products as { name?: string })?.name ?? "Product"}
                  </h2>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                    v{bom.version}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(bom)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(bom.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ul className="mt-4 space-y-2 pl-4">
                {(itemsByBom[bom.id] ?? []).map((item) => (
                  <li key={item.id} className="text-sm text-slate-600 dark:text-slate-400">
                    ├ {item.material_name} × {item.quantity} {item.unit}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
            <p className="text-slate-500 dark:text-slate-400">
              {products.length === 0
                ? "Create products first, then add BOMs."
                : "No BOMs yet."}
            </p>
            {products.length > 0 && (
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Create your first BOM
              </button>
            )}
          </div>
        )}
      </div>

      <BOMModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBom(null);
        }}
        onSave={handleSave}
        products={products}
        bom={editingBom}
      />
    </div>
  );
}

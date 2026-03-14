"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ProductModal, type ProductFormData } from "@/components/products/ProductModal";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & ProductFormData) | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const fetchProducts = useCallback(async () => {
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
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, description, unit")
      .eq("organization_id", appUser.organization_id)
      .order("name");

    if (error) {
      console.error(error);
      setProducts([]);
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function handleSave(data: ProductFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update({
          name: data.name,
          sku: data.sku || null,
          description: data.description || null,
          unit: data.unit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProduct.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("products").insert({
        organization_id: orgId,
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        unit: data.unit,
      });

      if (error) throw error;
    }

    setEditingProduct(null);
    await fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingProduct(null);
    await fetchProducts();
  }

  function openCreateModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct({
      ...product,
      sku: product.sku ?? "",
      description: product.description ?? "",
    });
    setModalOpen(true);
  }

  if (!supabase) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-800">
        Supabase not configured.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Products</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Manage products and SKUs</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!orgId}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Product
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : products.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{p.name}</p>
                  {p.sku && <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {p.sku}</p>}
                  {p.description && (
                    <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{p.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {p.unit}
                  </span>
                  <Link
                    href={`/dashboard/boms?product=${p.id}`}
                    className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    BOMs {"->"}
                  </Link>
                  <button
                    onClick={() => openEditModal(p)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
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
              {orgId ? "No products yet." : "Complete onboarding to add products."}
            </p>
            {orgId && (
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Create your first product
              </button>
            )}
          </div>
        )}
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSave}
        product={editingProduct}
      />
    </div>
  );
}


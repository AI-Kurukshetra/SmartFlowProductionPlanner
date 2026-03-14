"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { SupplierModal, type SupplierFormData } from "@/components/suppliers/SupplierModal";

interface Supplier {
  id: string;
  name: string;
  contact_email: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<(Supplier & SupplierFormData) | null>(null);
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
      setSuppliers([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data } = await supabase
      .from("suppliers")
      .select("id, name, contact_email")
      .eq("organization_id", appUser.organization_id)
      .order("name");
    setSuppliers((data ?? []) as unknown as Supplier[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: SupplierFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingSupplier) {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: data.name,
          contact_email: data.contact_email || null,
        })
        .eq("id", editingSupplier.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("suppliers").insert({
        organization_id: orgId,
        name: data.name,
        contact_email: data.contact_email || null,
      });

      if (error) throw error;
    }

    setEditingSupplier(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this supplier?")) return;

    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingSupplier(null);
    await fetchData();
  }

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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Suppliers</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage supplier contacts for procurement
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setModalOpen(true);
          }}
          disabled={!orgId}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add supplier
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : suppliers.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {suppliers.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{s.name}</p>
                  {s.contact_email && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.contact_email}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingSupplier({
                        ...s,
                        name: s.name,
                        contact_email: s.contact_email ?? "",
                      });
                      setModalOpen(true);
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No suppliers yet.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
            >
              Add your first supplier
            </button>
          </div>
        )}
      </div>

      <SupplierModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSave}
        item={editingSupplier}
      />
    </div>
  );
}

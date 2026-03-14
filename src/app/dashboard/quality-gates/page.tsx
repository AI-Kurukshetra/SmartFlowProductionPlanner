"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { QualityGateModal, type QualityGateFormData } from "@/components/quality-gates/QualityGateModal";

interface QualityGate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  sequence: number;
}

export default function QualityGatesPage() {
  const [gates, setGates] = useState<QualityGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGate, setEditingGate] = useState<(QualityGate & QualityGateFormData) | null>(null);
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
      setGates([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data } = await supabase
      .from("quality_gates")
      .select("id, name, description, type, sequence")
      .eq("organization_id", appUser.organization_id)
      .order("sequence");
    setGates(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: QualityGateFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingGate) {
      const { error } = await supabase
        .from("quality_gates")
        .update({
          name: data.name,
          description: data.description || null,
          type: data.type,
          sequence: data.sequence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingGate.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("quality_gates").insert({
        organization_id: orgId,
        name: data.name,
        description: data.description || null,
        type: data.type,
        sequence: data.sequence,
      });

      if (error) throw error;
    }

    setEditingGate(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this quality gate?")) return;

    const { error } = await supabase.from("quality_gates").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingGate(null);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quality Gates</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Inspection points and checkpoints in production flow
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGate(null);
            setModalOpen(true);
          }}
          disabled={!orgId}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add quality gate
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : gates.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {gates.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{g.name}</p>
                  {g.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{g.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {g.type} • seq {g.sequence}
                  </span>
                  <button
                    onClick={() => {
                      setEditingGate({
                        ...g,
                        name: g.name,
                        description: g.description ?? "",
                        type: g.type,
                        sequence: g.sequence,
                      });
                      setModalOpen(true);
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
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
            <p className="text-slate-500 dark:text-slate-400">No quality gates yet.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
            >
              Add your first quality gate
            </button>
          </div>
        )}
      </div>

      <QualityGateModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGate(null);
        }}
        onSave={handleSave}
        item={editingGate}
      />
    </div>
  );
}

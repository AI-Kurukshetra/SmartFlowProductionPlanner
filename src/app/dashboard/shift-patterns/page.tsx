"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ShiftPatternModal, type ShiftPatternFormData } from "@/components/shift-patterns/ShiftPatternModal";

interface Plant {
  id: string;
  name: string;
}

interface ShiftPattern {
  id: string;
  plant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  plant?: { name: string };
}

export default function ShiftPatternsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<(ShiftPattern & ShiftPatternFormData) | null>(
    null
  );
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
      setShiftPatterns([]);
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

    const { data: spData } = await supabase
      .from("shift_patterns")
      .select("id, plant_id, name, start_time, end_time, plant:plants(name)")
      .order("name");
    setShiftPatterns(spData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: ShiftPatternFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingPattern) {
      const { error } = await supabase
        .from("shift_patterns")
        .update({
          name: data.name,
          start_time: data.start_time,
          end_time: data.end_time,
        })
        .eq("id", editingPattern.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("shift_patterns").insert({
        plant_id: data.plant_id,
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time,
      });

      if (error) throw error;
    }

    setEditingPattern(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this shift pattern?")) return;

    const { error } = await supabase.from("shift_patterns").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingPattern(null);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Shift Patterns</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Working hours per plant for scheduling
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPattern(null);
            setModalOpen(true);
          }}
          disabled={!orgId || plants.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add shift pattern
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : shiftPatterns.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {shiftPatterns.map((sp) => {
              const plantName = (sp.plant as { name?: string })?.name ?? "Plant";
              const start = sp.start_time?.slice(0, 5) ?? "";
              const end = sp.end_time?.slice(0, 5) ?? "";
              return (
                <li
                  key={sp.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{sp.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {plantName} — {start} to {end}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingPattern({
                          ...sp,
                          plant_id: sp.plant_id,
                          name: sp.name,
                          start_time: sp.start_time,
                          end_time: sp.end_time,
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sp.id)}
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
              {plants.length === 0 ? "Add plants first, then add shift patterns." : "No shift patterns yet."}
            </p>
            {plants.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Add your first shift pattern
              </button>
            )}
          </div>
        )}
      </div>

      <ShiftPatternModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPattern(null);
        }}
        onSave={handleSave}
        plants={plants}
        item={editingPattern}
      />
    </div>
  );
}

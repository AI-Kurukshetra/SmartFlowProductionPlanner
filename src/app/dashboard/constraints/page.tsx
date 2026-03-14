"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ConstraintModal, type ConstraintFormData } from "@/components/constraints/ConstraintModal";

interface Resource {
  id: string;
  name: string;
}

interface Constraint {
  id: string;
  resource_id: string;
  type: string;
  value: string | null;
  resource?: { name: string };
}

export default function ConstraintsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<(Constraint & ConstraintFormData) | null>(
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
      setResources([]);
      setConstraints([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data: resData } = await supabase
      .from("resources")
      .select("id, name")
      .order("name");
    setResources(resData ?? []);

    const { data: conData } = await supabase
      .from("constraints")
      .select("id, resource_id, type, value, resource:resources(name)")
      .order("type");
    setConstraints(conData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: ConstraintFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingConstraint) {
      const { error } = await supabase
        .from("constraints")
        .update({ type: data.type, value: data.value || null })
        .eq("id", editingConstraint.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("constraints").insert({
        resource_id: data.resource_id,
        type: data.type,
        value: data.value || null,
      });

      if (error) throw error;
    }

    setEditingConstraint(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this constraint?")) return;

    const { error } = await supabase.from("constraints").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingConstraint(null);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Constraints</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Resource constraints for scheduling (max hours, setup time, etc.)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConstraint(null);
            setModalOpen(true);
          }}
          disabled={!orgId || resources.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add constraint
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : constraints.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {constraints.map((c) => {
              const resourceName = (c.resource as { name?: string })?.name ?? "Resource";
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {resourceName} — {c.type.replace(/_/g, " ")}
                    </p>
                    {c.value && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Value: {c.value}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingConstraint({
                          ...c,
                          resource_id: c.resource_id,
                          type: c.type,
                          value: c.value ?? "",
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
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
              {resources.length === 0
                ? "Add resources first, then add constraints."
                : "No constraints yet."}
            </p>
            {resources.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Add your first constraint
              </button>
            )}
          </div>
        )}
      </div>

      <ConstraintModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingConstraint(null);
        }}
        onSave={handleSave}
        resources={resources}
        item={editingConstraint}
      />
    </div>
  );
}

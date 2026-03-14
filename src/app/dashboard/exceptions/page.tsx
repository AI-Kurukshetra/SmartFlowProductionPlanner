"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ExceptionModal, type ExceptionFormData } from "@/components/exceptions/ExceptionModal";

interface Resource {
  id: string;
  name: string;
}

interface Exception {
  id: string;
  type: string;
  resource_id: string | null;
  work_order_id: string | null;
  description: string;
  severity: string;
  occurred_at: string;
  resolved_at: string | null;
  resource?: { name: string } | { name: string }[];
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function ExceptionsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [workOrders, setWorkOrders] = useState<{ id: string }[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<(Exception & ExceptionFormData) | null>(
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
      setWorkOrders([]);
      setExceptions([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data: resData } = await supabase.from("resources").select("id, name").order("name");
    setResources(resData ?? []);

    const { data: woData } = await supabase
      .from("work_orders")
      .select("id")
      .limit(100);
    setWorkOrders(woData ?? []);

    const { data: exData } = await supabase
      .from("exceptions")
      .select("id, type, resource_id, work_order_id, description, severity, occurred_at, resolved_at, resource:resources(name)")
      .eq("organization_id", appUser.organization_id)
      .order("occurred_at", { ascending: false });
    setExceptions(exData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: ExceptionFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    const payload = {
      organization_id: orgId,
      type: data.type,
      resource_id: data.resource_id || null,
      work_order_id: data.work_order_id || null,
      description: data.description,
      severity: data.severity,
      occurred_at: data.occurred_at,
      resolved_at: data.resolved_at || null,
      updated_at: new Date().toISOString(),
    };

    if (editingException) {
      const { error } = await supabase
        .from("exceptions")
        .update(payload)
        .eq("id", editingException.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("exceptions").insert(payload);

      if (error) throw error;
    }

    setEditingException(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this exception?")) return;

    const { error } = await supabase.from("exceptions").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingException(null);
    await fetchData();
  }

  const unresolvedCount = exceptions.filter((e) => !e.resolved_at).length;

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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Exceptions</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Downtime, deviations, and production alerts
          </p>
        </div>
        <button
          onClick={() => {
            setEditingException(null);
            setModalOpen(true);
          }}
          disabled={!orgId}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Log exception
        </button>
      </div>

      {unresolvedCount > 0 && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
          <h2 className="text-sm font-semibold text-rose-800 dark:text-rose-200">
            Unresolved exceptions ({unresolvedCount})
          </h2>
          <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
            Review and resolve these exceptions.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : exceptions.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {exceptions.map((ex) => {
              const resourceName = (ex.resource as { name?: string })?.name;
              return (
                <li
                  key={ex.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{ex.description}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {ex.type.replace(/_/g, " ")} • {formatDateTime(ex.occurred_at)}
                      {resourceName && ` • ${resourceName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ex.severity === "critical"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                          : ex.severity === "high"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                            : ex.severity === "medium"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {ex.severity}
                    </span>
                    {ex.resolved_at ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Resolved</span>
                    ) : (
                      <span className="text-xs text-rose-600 dark:text-rose-400">Open</span>
                    )}
                    <button
                      onClick={() => {
                        setEditingException({
                          ...ex,
                          type: ex.type,
                          resource_id: ex.resource_id ?? "",
                          work_order_id: ex.work_order_id ?? "",
                          description: ex.description,
                          severity: ex.severity,
                          occurred_at: ex.occurred_at,
                          resolved_at: ex.resolved_at ?? "",
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ex.id)}
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
            <p className="text-slate-500 dark:text-slate-400">No exceptions logged yet.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
            >
              Log your first exception
            </button>
          </div>
        )}
      </div>

      <ExceptionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingException(null);
        }}
        onSave={handleSave}
        resources={resources}
        workOrders={workOrders}
        item={editingException}
      />
    </div>
  );
}

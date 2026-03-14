"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MaintenanceModal, type MaintenanceFormData } from "@/components/maintenance/MaintenanceModal";

interface Resource {
  id: string;
  name: string;
}

interface MaintenanceWindow {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  status: string;
  resource?: { name: string };
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function MaintenancePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<(MaintenanceWindow & MaintenanceFormData) | null>(
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
      setWindows([]);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setOrgId(appUser.organization_id);

    const { data: resData } = await supabase.from("resources").select("id, name").order("name");
    setResources(resData ?? []);

    const { data: mwData } = await supabase
      .from("maintenance_windows")
      .select("id, resource_id, start_time, end_time, reason, status, resource:resources(name)")
      .order("start_time", { ascending: false });
    setWindows(mwData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: MaintenanceFormData) {
    if (!supabase || !orgId) throw new Error("Not configured");

    if (editingWindow) {
      const { error } = await supabase
        .from("maintenance_windows")
        .update({
          start_time: data.start_time,
          end_time: data.end_time,
          reason: data.reason || null,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingWindow.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("maintenance_windows").insert({
        resource_id: data.resource_id,
        start_time: data.start_time,
        end_time: data.end_time,
        reason: data.reason || null,
        status: data.status,
      });

      if (error) throw error;
    }

    setEditingWindow(null);
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this maintenance window?")) return;

    const { error } = await supabase.from("maintenance_windows").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingWindow(null);
    await fetchData();
  }

  const scheduledWindows = windows.filter((w) => w.status === "scheduled" || w.status === "in_progress");

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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Maintenance Windows
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Resource downtime — scheduler will avoid these slots
          </p>
        </div>
        <button
          onClick={() => {
            setEditingWindow(null);
            setModalOpen(true);
          }}
          disabled={!orgId || resources.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add maintenance
        </button>
      </div>

      {scheduledWindows.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Active maintenance ({scheduledWindows.length})
          </h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            These resources are unavailable for scheduling.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : windows.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {windows.map((w) => {
              const resourceName = (w.resource as { name?: string })?.name ?? "Resource";
              return (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{resourceName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDateTime(w.start_time)} — {formatDateTime(w.end_time)}
                      {w.reason && ` • ${w.reason}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        w.status === "scheduled"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          : w.status === "in_progress"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                            : w.status === "completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {w.status.replace(/_/g, " ")}
                    </span>
                    <button
                      onClick={() => {
                        setEditingWindow({
                          ...w,
                          resource_id: w.resource_id,
                          start_time: w.start_time,
                          end_time: w.end_time,
                          reason: w.reason ?? "",
                          status: w.status,
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
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
                ? "Add resources first, then add maintenance windows."
                : "No maintenance windows yet."}
            </p>
            {resources.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                Add your first maintenance window
              </button>
            )}
          </div>
        )}
      </div>

      <MaintenanceModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingWindow(null);
        }}
        onSave={handleSave}
        resources={resources}
        item={editingWindow}
      />
    </div>
  );
}

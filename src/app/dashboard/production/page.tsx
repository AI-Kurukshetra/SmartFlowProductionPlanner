"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ProductionRun {
  id: string;
  work_order_id: string | null;
  schedule_id: string | null;
  produced_quantity: number;
  start_time: string;
  end_time: string | null;
  work_order?: { quantity: number; product?: { name?: string } | { name?: string }[] } | { quantity: number; product?: { name?: string } | { name?: string }[] }[];
}

interface ProductionLog {
  id: string;
  production_run_id: string;
  event: string;
  created_at: string;
}

export default function ProductionTrackingPage() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [logsByRun, setLogsByRun] = useState<Record<string, ProductionLog[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
      setRuns([]);
      setLoading(false);
      return;
    }

    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", appUser.organization_id);
    const productIds = (products ?? []).map((p: { id: string }) => p.id);
    if (productIds.length === 0) {
      setRuns([]);
      setLoading(false);
      return;
    }

    const { data: woIds } = await supabase
      .from("work_orders")
      .select("id")
      .in("product_id", productIds);
    const ids = (woIds ?? []).map((w: { id: string }) => w.id);
    if (ids.length === 0) {
      setRuns([]);
      setLoading(false);
      return;
    }

    const { data: runsData } = await supabase
      .from("production_runs")
      .select(
        "id, work_order_id, schedule_id, produced_quantity, start_time, end_time, work_order:work_orders(quantity, product:products(name))"
      )
      .in("work_order_id", ids)
      .order("start_time", { ascending: false });

    const list = (runsData ?? []) as ProductionRun[];
    setRuns(list);

    const runIds = list.map((r) => r.id);
    if (runIds.length > 0) {
      const { data: logs } = await supabase
        .from("production_logs")
        .select("id, production_run_id, event, created_at")
        .in("production_run_id", runIds)
        .order("created_at", { ascending: true });
      const byRun: Record<string, ProductionLog[]> = {};
      for (const l of logs ?? []) {
        if (!byRun[l.production_run_id]) byRun[l.production_run_id] = [];
        byRun[l.production_run_id].push(l);
      }
      setLogsByRun(byRun);
    } else {
      setLogsByRun({});
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!supabase) {
    return <div className="rounded-xl bg-amber-50 p-6 text-amber-800">Supabase not configured.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Production tracking</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Runs from <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">production_runs</code> and{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">production_logs</code>
          </p>
        </div>
        <Link
          href="/dashboard/work-orders"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Work orders
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
            <p>No production runs yet.</p>
            <p className="mt-2 text-sm">Start production from a work order (Start production).</p>
            <Link href="/dashboard/work-orders" className="mt-4 inline-block text-violet-600 hover:underline dark:text-violet-400">
              Go to work orders →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {runs.map((r) => {
              const wo = r.work_order as { quantity?: number; product?: { name?: string } } | undefined;
              const name = wo?.product?.name ?? "Work order";
              const active = !r.end_time;
              return (
                <li key={r.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Started {new Date(r.start_time).toLocaleString()}
                        {r.end_time && ` · Ended ${new Date(r.end_time).toLocaleString()}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Produced: {r.produced_quantity}
                        {wo?.quantity != null && ` / target ${wo.quantity}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        active ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                      }`}
                    >
                      {active ? "In progress" : "Completed"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => (e === r.id ? null : r.id))}
                    className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
                  >
                    {expanded === r.id ? "Hide logs" : "Show production_logs"}
                  </button>
                  {expanded === r.id && (
                    <ul className="mt-2 space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
                      {(logsByRun[r.id] ?? []).length === 0 ? (
                        <li className="text-sm text-slate-500">No log rows.</li>
                      ) : (
                        (logsByRun[r.id] ?? []).map((log) => (
                          <li key={log.id} className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{log.event}</span>
                            <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

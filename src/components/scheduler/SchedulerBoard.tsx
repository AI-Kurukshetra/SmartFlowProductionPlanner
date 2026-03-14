"use client";

import { useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export type WorkOrder = {
  id: string;
  status: string;
  due_date: string | null;
  product?: { name?: string };
};

export type Resource = {
  id: string;
  name: string;
};

export type Schedule = {
  id: string;
  work_order_id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: string;
};

type ScheduleForm = {
  work_order_id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "in_progress" | "completed";
};

const TIMELINE_MIN_WIDTH = 1100;

function toLocalDateTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function hourRange(start: Date, end: Date) {
  const list: Date[] = [];
  const cursor = new Date(start);
  cursor.setMinutes(0, 0, 0);
  while (cursor <= end) {
    list.push(new Date(cursor));
    cursor.setHours(cursor.getHours() + 1);
  }
  return list;
}

export function SchedulerBoard({
  initialResources,
  initialWorkOrders,
  initialSchedules,
}: {
  initialResources: Resource[];
  initialWorkOrders: WorkOrder[];
  initialSchedules: Schedule[];
}) {
  const supabase = getSupabaseClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resources] = useState<Resource[]>(initialResources);
  const [workOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [filterResourceId, setFilterResourceId] = useState("all");
  const now = useMemo(() => new Date(), []);
  const [form, setForm] = useState<ScheduleForm>({
    work_order_id: initialWorkOrders[0]?.id ?? "",
    resource_id: initialResources[0]?.id ?? "",
    start_time: toLocalDateTimeInputValue(new Date(now.getTime() + 60 * 60 * 1000)),
    end_time: toLocalDateTimeInputValue(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
    status: "scheduled",
  });

  const resourceMap = useMemo(
    () => Object.fromEntries(resources.map((r) => [r.id, r.name])),
    [resources]
  );
  const workOrderMap = useMemo(
    () =>
      Object.fromEntries(
        workOrders.map((wo) => [wo.id, wo.product?.name ?? `Order ${wo.id.slice(0, 8)}`])
      ),
    [workOrders]
  );

  const visibleSchedules = useMemo(
    () =>
      filterResourceId === "all"
        ? schedules
        : schedules.filter((s) => s.resource_id === filterResourceId),
    [schedules, filterResourceId]
  );

  const timelineRange = useMemo(() => {
    if (!visibleSchedules.length) {
      const start = new Date();
      start.setMinutes(0, 0, 0);
      const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
      return { start, end };
    }

    const starts = visibleSchedules.map((s) => new Date(s.start_time).getTime());
    const ends = visibleSchedules.map((s) => new Date(s.end_time).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    const pad = 60 * 60 * 1000;
    return {
      start: new Date(min.getTime() - pad),
      end: new Date(max.getTime() + pad),
    };
  }, [visibleSchedules]);

  const timelineHours = useMemo(
    () => hourRange(timelineRange.start, timelineRange.end),
    [timelineRange]
  );

  const totalMs = Math.max(1, timelineRange.end.getTime() - timelineRange.start.getTime());

  const groupedByResource = useMemo(() => {
    const groups = new Map<string, Schedule[]>();
    for (const r of resources) groups.set(r.id, []);
    for (const s of visibleSchedules) {
      if (!groups.has(s.resource_id)) groups.set(s.resource_id, []);
      groups.get(s.resource_id)?.push(s);
    }
    return groups;
  }, [resources, visibleSchedules]);

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Invalid start/end time.");
      return;
    }
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }
    if (!form.work_order_id || !form.resource_id) {
      setError("Select work order and machine.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("schedules")
      .insert({
        work_order_id: form.work_order_id,
        resource_id: form.resource_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: form.status,
      })
      .select("id, work_order_id, resource_id, start_time, end_time, status")
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setSchedules((prev) =>
        [...prev, data as Schedule].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      );
    }
  }

  if (!supabase) {
    return <div className="rounded-xl bg-amber-50 p-6 text-amber-800">Supabase not configured.</div>;
  }

  return (
    <div className="px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Scheduler</h1>
          <p className="mt-1 text-slate-600">Work Order -&gt; Machine -&gt; Time Slot</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="resourceFilter" className="text-sm text-slate-600">
            Machine
          </label>
          <select
            id="resourceFilter"
            value={filterResourceId}
            onChange={(e) => setFilterResourceId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All machines</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Create Schedule Slot</h2>
        <form onSubmit={handleCreateSchedule} className="mt-4 grid gap-3 md:grid-cols-5">
          <select
            value={form.work_order_id}
            onChange={(e) => setForm((prev) => ({ ...prev, work_order_id: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select work order</option>
            {workOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {(wo.product?.name ?? "Order")} ({wo.status})
              </option>
            ))}
          </select>

          <select
            value={form.resource_id}
            onChange={(e) => setForm((prev) => ({ ...prev, resource_id: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select machine</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />

          <input
            type="datetime-local"
            value={form.end_time}
            onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />

          <div className="flex gap-2">
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value as ScheduleForm["status"] }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="scheduled">scheduled</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-4 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Gantt</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            scheduled
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            in_progress
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            completed
          </span>
        </div>

        {resources.length === 0 ? (
          <div className="py-10 text-center text-slate-500">No machines/resources found.</div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: TIMELINE_MIN_WIDTH }}>
              <div className="mb-2 grid grid-cols-[220px_1fr]">
                <div className="text-xs font-medium text-slate-500">Machine</div>
                <div className="relative h-8 border-b border-slate-200">
                  {timelineHours.map((h) => {
                    const x = ((h.getTime() - timelineRange.start.getTime()) / totalMs) * 100;
                    return (
                      <div key={h.toISOString()} className="absolute top-0 h-full" style={{ left: `${x}%` }}>
                        <div className="h-full border-l border-dashed border-slate-200 pl-1 text-[10px] text-slate-500">
                          {h.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {Array.from(groupedByResource.entries()).map(([resourceId, items]) => {
                if (filterResourceId !== "all" && resourceId !== filterResourceId) return null;
                return (
                  <div key={resourceId} className="grid grid-cols-[220px_1fr] border-b border-slate-100 py-2">
                    <div className="pr-4 text-sm font-medium text-slate-700">
                      {resourceMap[resourceId] ?? "Machine"}
                    </div>
                    <div className="relative h-12 rounded-md bg-slate-50">
                      {timelineHours.map((h) => {
                        const x = ((h.getTime() - timelineRange.start.getTime()) / totalMs) * 100;
                        return (
                          <div
                            key={`${resourceId}-${h.toISOString()}`}
                            className="absolute top-0 h-full border-l border-slate-100"
                            style={{ left: `${x}%` }}
                          />
                        );
                      })}
                      {items.map((s) => {
                        const startMs = new Date(s.start_time).getTime();
                        const endMs = new Date(s.end_time).getTime();
                        const left = ((startMs - timelineRange.start.getTime()) / totalMs) * 100;
                        const width = Math.max(2, ((endMs - startMs) / totalMs) * 100);
                        const tone =
                          s.status === "completed"
                            ? "bg-emerald-500"
                            : s.status === "in_progress"
                              ? "bg-amber-500"
                              : "bg-sky-500";

                        return (
                          <div
                            key={s.id}
                            className={`absolute top-2 h-8 rounded-md px-2 text-xs font-medium text-white shadow ${tone}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${workOrderMap[s.work_order_id] ?? "Work order"} | ${new Date(s.start_time).toLocaleString()} - ${new Date(s.end_time).toLocaleString()}`}
                          >
                            <div className="truncate leading-8">
                              {workOrderMap[s.work_order_id] ?? `Order ${s.work_order_id.slice(0, 6)}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

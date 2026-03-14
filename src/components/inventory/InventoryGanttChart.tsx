"use client";

import { useMemo } from "react";

interface InventoryItem {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
}

interface DailyLog {
  inventory_id: string;
  log_date: string;
  quantity: number;
}

interface InventoryGanttChartProps {
  inventory: InventoryItem[];
  dailyLogs: DailyLog[];
  startDate: Date;
  daysCount?: number;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InventoryGanttChart({
  inventory,
  dailyLogs,
  startDate,
  daysCount = 14,
}: InventoryGanttChartProps) {
  const dates = useMemo(() => {
    const list: Date[] = [];
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < daysCount; i++) {
      const copy = new Date(d);
      copy.setDate(d.getDate() + i);
      list.push(copy);
    }
    return list;
  }, [startDate, daysCount]);

  const logsByDateAndInv = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of dailyLogs) {
      map.set(`${log.inventory_id}:${log.log_date}`, Number(log.quantity));
    }
    return map;
  }, [dailyLogs]);

  const maxQty = useMemo(() => {
    let max = 0;
    for (const inv of inventory) max = Math.max(max, Number(inv.quantity));
    for (const log of dailyLogs) max = Math.max(max, Number(log.quantity));
    return Math.max(max, 1);
  }, [inventory, dailyLogs]);

  if (inventory.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="min-w-[600px]">
        <div className="grid border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: `200px repeat(${dates.length}, minmax(60px, 1fr))` }}>
          <div className="border-r border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
            Material
          </div>
          {dates.map((d) => (
            <div
              key={d.toISOString()}
              className="border-r border-slate-200 px-2 py-3 text-center text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400"
            >
              {d.getDate()} {d.toLocaleDateString("en", { month: "short" })}
            </div>
          ))}
        </div>
        {inventory.map((inv) => (
          <div
            key={inv.id}
            className="grid border-b border-slate-100 dark:border-slate-700 dark:border-slate-700/50"
            style={{ gridTemplateColumns: `200px repeat(${dates.length}, minmax(60px, 1fr))` }}
          >
            <div className="border-r border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200">
              {inv.material_name}
            </div>
            {dates.map((d) => {
              const key = toDateKey(d);
              const todayKey = toDateKey(new Date());
              const qty = logsByDateAndInv.get(`${inv.id}:${key}`) ?? (key === todayKey ? Number(inv.quantity) : null);
              const displayQty = qty !== null ? qty : "—";
              const isLow = qty !== null && qty < 10;
              return (
                <div
                  key={key}
                  className={`flex flex-col items-center justify-center border-r border-slate-100 px-2 py-0 dark:border-slate-700/50 ${
                    isLow ? "bg-rose-50/50 dark:bg-rose-900/10" : ""
                  }`}
                >
                  <div
                    className="mt-1 h-8 w-full max-w-[48px] rounded bg-slate-200 dark:bg-slate-600"
                    style={{
                      height: 32,
                      background: qty !== null
                        ? `linear-gradient(to top, ${isLow ? "#f87171" : "#8b5cf6"} ${Math.min(100, (qty / maxQty) * 100)}%, #e2e8f0 ${Math.min(100, (qty / maxQty) * 100)}%)`
                        : "#e2e8f0",
                    }}
                  />
                  <span className={`mt-1 text-xs ${qty !== null ? "font-medium text-slate-700 dark:text-slate-200" : "text-slate-400"}`}>
                    {displayQty}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

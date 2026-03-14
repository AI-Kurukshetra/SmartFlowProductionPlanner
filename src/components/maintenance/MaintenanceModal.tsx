"use client";

import { useState, useEffect, useCallback } from "react";

export interface MaintenanceFormData {
  resource_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
}

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MaintenanceFormData) => Promise<void>;
  resources: { id: string; name: string }[];
  item?: (MaintenanceFormData & { id: string }) | null;
}

const MAINTENANCE_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];

export function MaintenanceModal({ isOpen, onClose, onSave, resources, item }: MaintenanceModalProps) {
  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      setResourceId(item.resource_id);
      setStartTime(item.start_time?.slice(0, 16) ?? "");
      setEndTime(item.end_time?.slice(0, 16) ?? "");
      setReason(item.reason ?? "");
      setStatus(item.status);
    } else {
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000);
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setResourceId(resources[0]?.id ?? "");
      setStartTime(start.toISOString().slice(0, 16));
      setEndTime(end.toISOString().slice(0, 16));
      setReason("");
      setStatus("scheduled");
    }
    setError(null);
  }, [item, resources, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        resource_id: resourceId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        reason: reason.trim(),
        status,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:shadow-slate-900/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="maintenance-modal-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? "Edit maintenance window" : "Add maintenance window"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Resource *
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
              disabled={isEdit}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-800"
            >
              <option value="">Select resource</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Start time *
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              End time *
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Preventive maintenance, repair..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {MAINTENANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-70"
            >
              {loading ? "Saving..." : isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

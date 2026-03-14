"use client";

import { useState, useEffect, useCallback } from "react";

export interface ExceptionFormData {
  type: string;
  resource_id: string;
  work_order_id: string;
  description: string;
  severity: string;
  occurred_at: string;
  resolved_at: string;
}

interface ExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExceptionFormData) => Promise<void>;
  resources: { id: string; name: string }[];
  workOrders: { id: string }[];
  item?: (ExceptionFormData & { id: string }) | null;
}

const EXCEPTION_TYPES = ["downtime", "quality", "delay", "material_shortage", "equipment_failure", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export function ExceptionModal({ isOpen, onClose, onSave, resources, workOrders, item }: ExceptionModalProps) {
  const [type, setType] = useState("downtime");
  const [resourceId, setResourceId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [occurredAt, setOccurredAt] = useState("");
  const [resolvedAt, setResolvedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      setType(item.type);
      setResourceId(item.resource_id ?? "");
      setWorkOrderId(item.work_order_id ?? "");
      setDescription(item.description);
      setSeverity(item.severity);
      setOccurredAt(item.occurred_at?.slice(0, 16) ?? "");
      setResolvedAt(item.resolved_at?.slice(0, 16) ?? "");
    } else {
      const now = new Date().toISOString().slice(0, 16);
      setType("downtime");
      setResourceId(resources[0]?.id ?? "");
      setWorkOrderId(workOrders[0]?.id ?? "");
      setDescription("");
      setSeverity("medium");
      setOccurredAt(now);
      setResolvedAt("");
    }
    setError(null);
  }, [item, resources, workOrders, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        type,
        resource_id: resourceId || "",
        work_order_id: workOrderId || "",
        description: description.trim(),
        severity,
        occurred_at: new Date(occurredAt).toISOString(),
        resolved_at: resolvedAt ? new Date(resolvedAt).toISOString() : "",
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
      aria-labelledby="exception-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:shadow-slate-900/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="exception-modal-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? "Edit exception" : "Log exception"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                {EXCEPTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the exception..."
              required
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Resource
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">None</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Work order
            </label>
            <select
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">None</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.id.slice(0, 8)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Occurred at *
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Resolved at
            </label>
            <input
              type="datetime-local"
              value={resolvedAt}
              onChange={(e) => setResolvedAt(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
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
              {loading ? "Saving..." : isEdit ? "Update" : "Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

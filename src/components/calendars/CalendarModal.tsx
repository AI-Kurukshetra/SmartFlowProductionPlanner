"use client";

import { useState, useEffect, useCallback } from "react";

export interface CalendarFormData {
  plant_id: string;
  name: string;
  date: string;
  is_working_day: boolean;
  notes: string;
}

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CalendarFormData) => Promise<void>;
  plants: { id: string; name: string }[];
  item?: (CalendarFormData & { id: string }) | null;
}

export function CalendarModal({ isOpen, onClose, onSave, plants, item }: CalendarModalProps) {
  const [plantId, setPlantId] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      setPlantId(item.plant_id);
      setName(item.name);
      setDate(item.date?.slice(0, 10) ?? "");
      setIsWorkingDay(item.is_working_day);
      setNotes(item.notes ?? "");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setPlantId(plants[0]?.id ?? "");
      setName("");
      setDate(today);
      setIsWorkingDay(true);
      setNotes("");
    }
    setError(null);
  }, [item, plants, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        plant_id: plantId,
        name: name.trim(),
        date,
        is_working_day: isWorkingDay,
        notes: notes.trim(),
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
      aria-labelledby="calendar-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:shadow-slate-900/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="calendar-modal-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? "Edit calendar entry" : "Add calendar entry"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Plant *
            </label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              required
              disabled={isEdit}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-800"
            >
              <option value="">Select plant</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Holiday, Maintenance day..."
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isEdit}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_working_day"
              checked={isWorkingDay}
              onChange={(e) => setIsWorkingDay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="is_working_day" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Working day (uncheck for holidays/off days)
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
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
              {loading ? "Saving..." : isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

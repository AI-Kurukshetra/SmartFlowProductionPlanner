"use client";

import { useState, useEffect } from "react";

export interface BOMItemForm {
  id?: string;
  material_name: string;
  quantity: number;
  unit: string;
}

interface BOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, version: number, items: BOMItemForm[], bomId?: string) => Promise<void>;
  products: { id: string; name: string }[];
  bom?: { id: string; product_id: string; version: number; items: BOMItemForm[] } | null;
}

const UNITS = ["ea", "kg", "g", "L", "mL", "m", "cm", "pcs", "box", "set"];

export function BOMModal({ isOpen, onClose, onSave, products, bom }: BOMModalProps) {
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState(1);
  const [items, setItems] = useState<BOMItemForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!bom;

  useEffect(() => {
    if (bom) {
      setProductId(bom.product_id);
      setVersion(bom.version);
      setItems(bom.items.length ? bom.items : [{ material_name: "", quantity: 1, unit: "ea" }]);
    } else {
      setProductId(products[0]?.id ?? "");
      setVersion(1);
      setItems([{ material_name: "", quantity: 1, unit: "ea" }]);
    }
    setError(null);
  }, [bom, products, isOpen]);

  function addItem() {
    setItems([...items, { material_name: "", quantity: 1, unit: "ea" }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof BOMItemForm, value: string | number) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validItems = items.filter((i) => i.material_name.trim());
    if (validItems.length === 0) {
      setError("Add at least one material");
      setLoading(false);
      return;
    }

    if (!productId) {
      setError("Select a product");
      setLoading(false);
      return;
    }

    try {
      await onSave(productId, version, validItems, bom?.id ?? undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:shadow-slate-900/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? "Edit BOM" : "Create BOM"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Product *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              disabled={isEdit}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Version</label>
              <input
                type="number"
                min={1}
                value={version}
                onChange={(e) => setVersion(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Materials *</label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                + Add material
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <input
                    placeholder="Material name"
                    value={item.material_name}
                    onChange={(e) => updateItem(i, "material_name", e.target.value)}
                    className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    className="w-24 rounded border border-slate-300 px-2 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="rounded p-2 text-rose-500 hover:bg-rose-50"
                    aria-label="Remove"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-70"
            >
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

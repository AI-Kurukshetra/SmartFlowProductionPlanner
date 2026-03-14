import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="p-6">
      <Link href="/dashboard" className="text-sm text-teal-600 hover:text-teal-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Inventory</h1>
      <p className="mt-2 text-slate-600">Track materials and stock. (Coming soon)</p>
    </div>
  );
}

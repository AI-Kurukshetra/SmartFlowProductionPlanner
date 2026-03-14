"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResourcesOnboardingPage() {
  const [workCenterName, setWorkCenterName] = useState("");
  const [workCenterCode, setWorkCenterCode] = useState("");
  const [machineName, setMachineName] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [machineType, setMachineType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plantId, setPlantId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchPlant() {
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
      if (!appUser?.organization_id) return;
      const { data: plants } = await supabase
        .from("plants")
        .select("id")
        .eq("organization_id", appUser.organization_id)
        .limit(1);
      setPlantId(plants?.[0]?.id ?? null);
    }
    fetchPlant();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !plantId) return;
    setLoading(true);
    setError(null);

    const { data: wc, error: wcError } = await supabase
      .from("work_centers")
      .insert({
        plant_id: plantId,
        name: workCenterName,
        code: workCenterCode || null,
      })
      .select("id")
      .single();

    if (wcError) {
      setError(wcError.message);
      setLoading(false);
      return;
    }

    const { error: machineError } = await supabase.from("machines").insert({
      work_center_id: wc.id,
      name: machineName,
      code: machineCode || null,
      machine_type: machineType || null,
    });

    if (machineError) {
      setError(machineError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (!supabase) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-amber-800">Supabase not configured.</p>
      </div>
    );
  }

  if (!plantId) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Add resources</h2>
      <p className="mt-1 text-sm text-slate-500">
        Create a work center and add your first machine.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-sm font-medium text-slate-700">Work center</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="wc-name" className="mb-1 block text-xs font-medium text-slate-600">
                Name
              </label>
              <input
                id="wc-name"
                type="text"
                value={workCenterName}
                onChange={(e) => setWorkCenterName(e.target.value)}
                placeholder="Assembly Line 1"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label htmlFor="wc-code" className="mb-1 block text-xs font-medium text-slate-600">
                Code (optional)
              </label>
              <input
                id="wc-code"
                type="text"
                value={workCenterCode}
                onChange={(e) => setWorkCenterCode(e.target.value)}
                placeholder="WC-001"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-sm font-medium text-slate-700">First machine</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="m-name" className="mb-1 block text-xs font-medium text-slate-600">
                Machine name
              </label>
              <input
                id="m-name"
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="CNC Machine 1"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label htmlFor="m-code" className="mb-1 block text-xs font-medium text-slate-600">
                Code (optional)
              </label>
              <input
                id="m-code"
                type="text"
                value={machineCode}
                onChange={(e) => setMachineCode(e.target.value)}
                placeholder="MCH-001"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label htmlFor="m-type" className="mb-1 block text-xs font-medium text-slate-600">
                Type (optional)
              </label>
              <input
                id="m-type"
                type="text"
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                placeholder="CNC, Assembly, Packaging..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {loading ? "Creating..." : "Complete setup → Dashboard"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PlantOnboardingPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchOrg() {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("app_users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      setOrgId(data?.organization_id ?? null);
    }
    fetchOrg();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !orgId) return;
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("plants").insert({
      organization_id: orgId,
      name,
      location: location || null,
      timezone: timezone || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding/resources");
    router.refresh();
  }

  if (!supabase) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-700/40 dark:bg-amber-900/20">
        <p className="text-amber-800 dark:text-amber-300">Supabase not configured.</p>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/40">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Setup your plant</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Add your first production plant or facility.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Plant name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main Production Plant"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>

        <div>
          <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Location (optional)
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ahmedabad, India"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>

        <div>
          <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (ET)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-70"
        >
          {loading ? "Creating..." : "Continue to Resources"}
        </button>
      </form>
    </div>
  );
}

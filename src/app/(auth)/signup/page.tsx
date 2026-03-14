"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserRole } from "@/lib/types/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "planner", label: "Planner" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operator", label: "Operator" },
];

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Failed to fetch"
          ? "Could not reach Supabase (network). Check NEXT_PUBLIC_SUPABASE_URL in .env.local and restart dev; ensure the Supabase project is not paused."
          : err instanceof Error
            ? err.message
            : "Sign-up failed";
      setError(msg);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 dark:bg-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-lg dark:border-amber-700/40 dark:bg-amber-900/20">
          <h1 className="text-xl font-semibold text-amber-800">Supabase not configured</h1>
          <p className="mt-3 text-sm text-amber-700">
            Copy <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.example</code> to{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code> and add your Supabase project URL and anon key.
          </p>
          <p className="mt-2 text-xs text-amber-600">Get them from Supabase Dashboard {"->"} Project Settings {"->"} API</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-amber-700 hover:text-amber-800">
            {"<-"} Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-700/20" />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 p-6 lg:grid-cols-2">
        <section className="hidden rounded-3xl border border-slate-200/70 bg-white/80 p-10 shadow-xl backdrop-blur md:block dark:border-slate-700 dark:bg-slate-800/80">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Smart Product Planner</p>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-slate-900 dark:text-slate-100">
            Start your planning workspace.
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Create your account and manage plants, resources, products, and schedules from one place.
          </p>
          <div className="mt-8 space-y-3">
            <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Structured onboarding for manufacturing teams
            </div>
            <div className="rounded-xl bg-cyan-100 px-4 py-3 text-sm font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
              Role-based access and invite flow
            </div>
            <div className="rounded-xl bg-violet-100 px-4 py-3 text-sm font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
              Planner, Supervisor, Operator dashboards
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-300">Smart Product Planner</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-800 dark:text-slate-100">Create account</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set up your workspace access</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Min 6 characters</span>
            </div>

            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-800"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-slate-800"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

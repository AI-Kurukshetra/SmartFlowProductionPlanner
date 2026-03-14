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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-amber-800">Supabase not configured</h1>
          <p className="mt-3 text-sm text-amber-700">
            Copy <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.example</code> to{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code> and add your Supabase project URL and anon key.
          </p>
          <p className="mt-2 text-xs text-amber-600">
            Get them from Supabase Dashboard → Project Settings → API
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-amber-700 hover:text-amber-800">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 dark:bg-slate-900">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Create account</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Join Smart Product Planner</p>
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
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
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
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-800"
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
            className="mt-1 w-full rounded-lg bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

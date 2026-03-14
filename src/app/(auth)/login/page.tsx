"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Failed to fetch"
          ? "Could not reach Supabase (network). Check .env.local: NEXT_PUBLIC_SUPABASE_URL must be https://YOUR_REF.supabase.co with no extra spaces; restart npm run dev after edits. If the URL is correct, open your Supabase project in the dashboard. Paused projects block login."
          : err instanceof Error
            ? err.message
            : "Sign-in failed";
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
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-700/20" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-700/20" />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 p-6 lg:grid-cols-2">
        <section className="hidden rounded-3xl border border-slate-200/70 bg-white/80 p-10 shadow-xl backdrop-blur md:block dark:border-slate-700 dark:bg-slate-800/80">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Smart Product Planner</p>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-slate-900 dark:text-slate-100">
            Plan faster. Build smarter.
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Unified planning for products, resources, scheduling, and production visibility.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-cyan-100 p-4 dark:bg-cyan-900/30">
              <p className="text-xs font-medium text-cyan-800 dark:text-cyan-300">Products</p>
            </div>
            <div className="rounded-2xl bg-violet-100 p-4 dark:bg-violet-900/30">
              <p className="text-xs font-medium text-violet-800 dark:text-violet-300">Work Orders</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-4 dark:bg-emerald-900/30">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Scheduling</p>
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Smart Product Planner</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-800 dark:text-slate-100">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
                {error}
              </div>
            )}

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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
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
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-slate-800"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300">
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

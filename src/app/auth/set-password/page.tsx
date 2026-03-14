"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setCheckingAuth(false);
      if (!data.user) {
        router.replace("/login?message=Please sign in to set your password");
      }
    })();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
      setLoading(false);
    }
  }

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-lg dark:border-amber-700/40 dark:bg-amber-900/20">
          <h1 className="text-xl font-semibold text-amber-800">Supabase not configured</h1>
          <p className="mt-3 text-sm text-amber-700">
            Copy <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.example</code> to{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code> and add your Supabase credentials.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-amber-700">
            {"<-"} Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-6">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">
              Smart Product Planner
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">Set your password</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You&apos;ve been invited. Create a password to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                New password
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-slate-800"
            >
              {loading ? "Setting password..." : "Set password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have a password?{" "}
            <Link
              href="/login"
              className="font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

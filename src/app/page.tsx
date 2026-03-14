import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const hasSupabaseConfig =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        redirect("/onboarding");
      }
    } catch {
      // Continue to show landing
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/20" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
            Smart Product Planner
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
            Build production plans with clarity and speed.
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Manage plants, resources, products, work orders, and scheduling workflows in one connected system.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">Products</span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">Work Orders</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Scheduler</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Inventory</span>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Planner Preview</p>
            <svg viewBox="0 0 600 210" className="mt-3 w-full" role="img" aria-label="Planner board illustration">
              <rect x="0" y="0" width="600" height="210" rx="14" fill="currentColor" className="text-white dark:text-slate-900" />
              <rect x="18" y="20" width="120" height="170" rx="10" fill="#CFFAFE" />
              <rect x="160" y="20" width="120" height="170" rx="10" fill="#EDE9FE" />
              <rect x="302" y="20" width="120" height="170" rx="10" fill="#D1FAE5" />
              <rect x="444" y="20" width="138" height="170" rx="10" fill="#FEF3C7" />
              <rect x="30" y="35" width="96" height="12" rx="6" fill="#0891B2" opacity="0.75" />
              <rect x="172" y="35" width="96" height="12" rx="6" fill="#7C3AED" opacity="0.75" />
              <rect x="314" y="35" width="96" height="12" rx="6" fill="#059669" opacity="0.75" />
              <rect x="456" y="35" width="114" height="12" rx="6" fill="#B45309" opacity="0.75" />
              <rect x="30" y="60" width="86" height="28" rx="8" fill="#0E7490" opacity="0.9" />
              <rect x="172" y="60" width="86" height="28" rx="8" fill="#6D28D9" opacity="0.9" />
              <rect x="314" y="60" width="86" height="28" rx="8" fill="#047857" opacity="0.9" />
              <rect x="456" y="60" width="104" height="28" rx="8" fill="#92400E" opacity="0.9" />
              <rect x="30" y="100" width="72" height="22" rx="7" fill="#0891B2" opacity="0.65" />
              <rect x="172" y="100" width="72" height="22" rx="7" fill="#7C3AED" opacity="0.65" />
              <rect x="314" y="100" width="72" height="22" rx="7" fill="#059669" opacity="0.65" />
              <rect x="456" y="100" width="90" height="22" rx="7" fill="#B45309" opacity="0.65" />
            </svg>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-10">
          <h2 className="text-2xl font-semibold">Get started</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Choose how you want to continue.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/signup"
              className="block w-full rounded-xl bg-slate-900 px-6 py-3 text-center font-medium text-white transition hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-700"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="block w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Sign in
            </Link>
          </div>

          {!hasSupabaseConfig && (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
              Add Supabase credentials to <code className="rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-900/40">.env.local</code> to enable auth.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

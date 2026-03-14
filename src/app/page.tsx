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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50/40 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-16 text-center sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Smart Product Planner
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Manage planning workflows across admin, planner, supervisor, and operator roles.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="w-full rounded-lg bg-slate-900 px-6 py-3 text-center font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Create account
          </Link>
        </div>

        {!hasSupabaseConfig && (
          <p className="mt-8 text-sm text-amber-600">
            Add Supabase credentials to <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code> to enable auth.
          </p>
        )}
      </div>
    </main>
  );
}

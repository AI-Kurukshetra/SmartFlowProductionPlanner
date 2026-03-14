import Link from "next/link";

export default function SetupRequiredPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <h1 className="text-xl font-semibold text-amber-900 dark:text-amber-200">
        Account setup required
      </h1>
      <p className="mt-2 text-amber-800 dark:text-amber-300">
        Your account is missing a profile row in the database. Run one of these to fix it:
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-amber-300 bg-white p-4 dark:border-amber-700 dark:bg-amber-950/50">
          <p className="font-medium text-amber-900 dark:text-amber-200">Option 1: Run SQL (recommended)</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-amber-800 dark:text-amber-300">
            <li>Open Supabase Dashboard → SQL Editor</li>
            <li>Copy contents of <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">supabase/BACKFILL_APP_USERS.sql</code></li>
            <li>Paste and Run</li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div className="rounded-lg border border-amber-300 bg-white p-4 dark:border-amber-700 dark:bg-amber-950/50">
          <p className="font-medium text-amber-900 dark:text-amber-200">Option 2: Use service role key</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Add <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">.env.local</code> (from Project Settings → API), then restart <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">npm run dev</code>.
          </p>
        </div>
      </div>

      <p className="mt-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
        >
          ← Back to Dashboard
        </Link>
      </p>
    </div>
  );
}

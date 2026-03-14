import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { path: "/onboarding/organization", label: "Organization" },
  { path: "/onboarding/plant", label: "Plant" },
  { path: "/onboarding/resources", label: "Resources" },
];

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  let plants: { id: string }[] = [];
  let workCenters: { id: string }[] = [];

  if (appUser?.organization_id) {
    const { data: p } = await supabase
      .from("plants")
      .select("id")
      .eq("organization_id", appUser.organization_id);
    plants = p ?? [];
    if (plants.length > 0) {
      const { data: wc } = await supabase
        .from("work_centers")
        .select("id")
        .eq("plant_id", plants[0].id);
      workCenters = wc ?? [];
    }
  }

  const hasOrg = !!appUser?.organization_id;
  const hasPlant = (plants?.length ?? 0) > 0;
  const hasResources = (workCenters?.length ?? 0) > 0;

  if (hasOrg && hasPlant && hasResources) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Smart Product Planner
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">Setup</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step.path} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                      (step.path === "/onboarding/organization" && hasOrg) ||
                      (step.path === "/onboarding/plant" && hasPlant) ||
                      (step.path === "/onboarding/resources" && hasResources)
                        ? "bg-teal-600 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mx-2 h-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

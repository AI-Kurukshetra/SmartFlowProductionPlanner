import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SchedulerBoard, type Resource, type Schedule, type WorkOrder } from "@/components/scheduler/SchedulerBoard";

export default async function SchedulerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!appUser?.organization_id) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Scheduler</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Complete onboarding first to configure organization and resources.
        </p>
      </div>
    );
  }

  const { data: resources } = await supabase.from("resources").select("id, name").order("name");

  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("organization_id", appUser.organization_id);

  const productIds = (products ?? []).map((p: { id: string }) => p.id);
  const { data: workOrders } =
    productIds.length > 0
      ? await supabase
          .from("work_orders")
          .select("id, status, due_date, product:products(name)")
          .in("product_id", productIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, work_order_id, resource_id, start_time, end_time, status")
    .order("start_time", { ascending: true });

  return (
    <SchedulerBoard
      initialResources={(resources ?? []) as Resource[]}
      initialWorkOrders={(workOrders ?? []) as WorkOrder[]}
      initialSchedules={(schedules ?? []) as Schedule[]}
      initialNowIso={new Date().toISOString()}
    />
  );
}

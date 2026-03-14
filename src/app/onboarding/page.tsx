import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
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

  const hasOrg = !!appUser?.organization_id;

  if (!hasOrg) {
    redirect("/onboarding/organization");
  }

  const { data: plants } = await supabase
    .from("plants")
    .select("id")
    .eq("organization_id", appUser.organization_id);

  const hasPlant = (plants?.length ?? 0) > 0;

  if (!hasPlant) {
    redirect("/onboarding/plant");
  }

  redirect("/onboarding/resources");
}

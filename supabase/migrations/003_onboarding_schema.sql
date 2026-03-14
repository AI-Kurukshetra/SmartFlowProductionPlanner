-- Plants, Work Centers, Machines (Resources) for onboarding
CREATE TABLE IF NOT EXISTS public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id UUID NOT NULL REFERENCES public.work_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  machine_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Organizations: allow authenticated users to create (for onboarding)
DROP POLICY IF EXISTS "Allow create organizations" ON public.organizations;
CREATE POLICY "Allow create organizations" ON public.organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS: Users can manage plants in their organization
CREATE POLICY "Org members manage plants" ON public.plants FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY "Org members manage work_centers" ON public.work_centers FOR ALL
  USING (plant_id IN (SELECT p.id FROM public.plants p WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (plant_id IN (SELECT p.id FROM public.plants p WHERE p.organization_id = public.current_user_organization_id()));

CREATE POLICY "Org members manage machines" ON public.machines FOR ALL
  USING (work_center_id IN (SELECT wc.id FROM public.work_centers wc JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (work_center_id IN (SELECT wc.id FROM public.work_centers wc JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

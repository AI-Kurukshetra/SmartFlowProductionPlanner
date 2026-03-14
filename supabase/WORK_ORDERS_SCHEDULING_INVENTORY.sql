-- ============================================
-- Work Orders, Scheduling, Inventory
-- Run in Supabase SQL Editor
-- Prerequisite: CORE_MODULES.sql (products, resources)
-- ============================================

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.app_users WHERE id = auth.uid() LIMIT 1; $$;

-- ============================================
-- 1. WORK ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage work_orders" ON public.work_orders;
CREATE POLICY "Org members manage work_orders" ON public.work_orders FOR ALL
  USING (product_id IN (SELECT id FROM public.products WHERE organization_id = public.current_user_organization_id()))
  WITH CHECK (product_id IN (SELECT id FROM public.products WHERE organization_id = public.current_user_organization_id()));

DROP POLICY IF EXISTS "Org members manage operations" ON public.operations;
CREATE POLICY "Org members manage operations" ON public.operations FOR ALL
  USING (work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

-- ============================================
-- 2. SCHEDULING (Work Order → Operation → Resource → Time Slot)
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage schedules" ON public.schedules;
CREATE POLICY "Org members manage schedules" ON public.schedules FOR ALL
  USING (work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

DROP POLICY IF EXISTS "Org members manage constraints" ON public.constraints;
CREATE POLICY "Org members manage constraints" ON public.constraints FOR ALL
  USING (resource_id IN (SELECT r.id FROM public.resources r JOIN public.work_centers wc ON r.work_center_id = wc.id JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (resource_id IN (SELECT r.id FROM public.resources r JOIN public.work_centers wc ON r.work_center_id = wc.id JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

-- ============================================
-- 3. INVENTORY & SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'ea',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage suppliers" ON public.suppliers;
CREATE POLICY "Org members manage suppliers" ON public.suppliers FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Org members manage inventory" ON public.inventory;
CREATE POLICY "Org members manage inventory" ON public.inventory FOR ALL
  USING (plant_id IN (SELECT id FROM public.plants WHERE organization_id = public.current_user_organization_id()))
  WITH CHECK (plant_id IN (SELECT id FROM public.plants WHERE organization_id = public.current_user_organization_id()));

CREATE UNIQUE INDEX IF NOT EXISTS inventory_plant_material_unique ON public.inventory (plant_id, material_name);

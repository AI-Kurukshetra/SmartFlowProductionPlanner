-- ============================================
-- Core Modules - Run in Supabase SQL Editor
-- Prerequisite: Run ONBOARDING_TABLES.sql first (plants, work_centers)
-- ============================================

-- Ensure helper exists
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.app_users WHERE id = auth.uid() LIMIT 1; $$;
REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated;

-- ============================================
-- 1. RESOURCES (manufacturing resources)
-- ============================================
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id UUID NOT NULL REFERENCES public.work_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  capacity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage resources" ON public.resources;
CREATE POLICY "Org members manage resources" ON public.resources FOR ALL
  USING (work_center_id IN (SELECT wc.id FROM public.work_centers wc JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (work_center_id IN (SELECT wc.id FROM public.work_centers wc JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  unit TEXT DEFAULT 'ea',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage products" ON public.products;
CREATE POLICY "Org members manage products" ON public.products FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE UNIQUE INDEX IF NOT EXISTS products_org_sku_unique ON public.products (organization_id, sku) WHERE sku IS NOT NULL;

-- ============================================
-- 3. BOMs (Bill of Materials)
-- ============================================
CREATE TABLE IF NOT EXISTS public.boms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, version)
);

CREATE TABLE IF NOT EXISTS public.bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES public.boms(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage boms" ON public.boms;
CREATE POLICY "Org members manage boms" ON public.boms FOR ALL
  USING (product_id IN (SELECT id FROM public.products WHERE organization_id = public.current_user_organization_id()))
  WITH CHECK (product_id IN (SELECT id FROM public.products WHERE organization_id = public.current_user_organization_id()));

DROP POLICY IF EXISTS "Org members manage bom_items" ON public.bom_items;
CREATE POLICY "Org members manage bom_items" ON public.bom_items FOR ALL
  USING (bom_id IN (SELECT b.id FROM public.boms b JOIN public.products p ON b.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (bom_id IN (SELECT b.id FROM public.boms b JOIN public.products p ON b.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

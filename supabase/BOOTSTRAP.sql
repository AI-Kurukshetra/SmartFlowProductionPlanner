-- ============================================
-- Smart Product Planner - Full Schema Bootstrap
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Fixes: "Could not find the table 'public.organizations' in the schema cache"
-- ============================================

-- Create enum (idempotent)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'planner', 'supervisor', 'operator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Organizations & App Users (001)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.app_users WHERE id = auth.uid() LIMIT 1; $$;

REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated;

DROP POLICY IF EXISTS "Users can read own profile" ON public.app_users;
CREATE POLICY "Users can read own profile" ON public.app_users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read org members" ON public.app_users;
CREATE POLICY "Users can read org members" ON public.app_users FOR SELECT
  USING (organization_id IS NOT NULL AND organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.app_users;
CREATE POLICY "Allow insert for authenticated" ON public.app_users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.app_users;
CREATE POLICY "Users can update own profile" ON public.app_users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read organizations" ON public.organizations;
CREATE POLICY "Anyone can read organizations" ON public.organizations FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('admin','planner','supervisor','operator')
      THEN (NEW.raw_user_meta_data->>'role')::user_role ELSE 'operator'::user_role END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Industry column (002)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS industry TEXT;

-- 3. Plants, Work Centers, Machines (003)
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

DROP POLICY IF EXISTS "Allow create organizations" ON public.organizations;
CREATE POLICY "Allow create organizations" ON public.organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Org members manage plants" ON public.plants;
CREATE POLICY "Org members manage plants" ON public.plants FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Org members manage work_centers" ON public.work_centers;
CREATE POLICY "Org members manage work_centers" ON public.work_centers FOR ALL
  USING (plant_id IN (SELECT p.id FROM public.plants p WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (plant_id IN (SELECT p.id FROM public.plants p WHERE p.organization_id = public.current_user_organization_id()));

DROP POLICY IF EXISTS "Org members manage machines" ON public.machines;
CREATE POLICY "Org members manage machines" ON public.machines FOR ALL
  USING (work_center_id IN (SELECT wc.id FROM public.work_centers wc JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (work_center_id IN (SELECT wc.id FROM public.work_centers wc JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()));

-- 5. Shift patterns, plants location/timezone (005)
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS location TEXT, ADD COLUMN IF NOT EXISTS timezone TEXT;
UPDATE public.plants SET location = COALESCE(location, address) WHERE location IS NULL AND address IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shift_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage shift_patterns" ON public.shift_patterns;
CREATE POLICY "Org members manage shift_patterns" ON public.shift_patterns FOR ALL
  USING (plant_id IN (SELECT p.id FROM public.plants p WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (plant_id IN (SELECT p.id FROM public.plants p WHERE p.organization_id = public.current_user_organization_id()));
CREATE UNIQUE INDEX IF NOT EXISTS shift_patterns_plant_name_unique ON public.shift_patterns (plant_id, name);

-- 6. Resources, Products, BOMs (006)
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

-- 7. Work Orders, Operations, Schedules, Constraints, Suppliers, Inventory (007)
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
CREATE POLICY "Org members manage suppliers" ON public.suppliers FOR ALL USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());
DROP POLICY IF EXISTS "Org members manage inventory" ON public.inventory;
CREATE POLICY "Org members manage inventory" ON public.inventory FOR ALL
  USING (plant_id IN (SELECT id FROM public.plants WHERE organization_id = public.current_user_organization_id()))
  WITH CHECK (plant_id IN (SELECT id FROM public.plants WHERE organization_id = public.current_user_organization_id()));
CREATE UNIQUE INDEX IF NOT EXISTS inventory_plant_material_unique ON public.inventory (plant_id, material_name);

-- 8. Production runs, logs, KPIs (008)
CREATE TABLE IF NOT EXISTS public.production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id UUID NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage production_runs" ON public.production_runs;
CREATE POLICY "Org members manage production_runs" ON public.production_runs FOR ALL
  USING (schedule_id IN (SELECT s.id FROM public.schedules s JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (schedule_id IN (SELECT s.id FROM public.schedules s JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()));
DROP POLICY IF EXISTS "Org members manage production_logs" ON public.production_logs;
CREATE POLICY "Org members manage production_logs" ON public.production_logs FOR ALL
  USING (production_run_id IN (SELECT pr.id FROM public.production_runs pr JOIN public.schedules s ON pr.schedule_id = s.id JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (production_run_id IN (SELECT pr.id FROM public.production_runs pr JOIN public.schedules s ON pr.schedule_id = s.id JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()));
DROP POLICY IF EXISTS "Org members manage kpis" ON public.kpis;
CREATE POLICY "Org members manage kpis" ON public.kpis FOR ALL USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

-- 11. Production runs work_order_id (011)
ALTER TABLE public.production_runs ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE;
UPDATE public.production_runs pr SET work_order_id = s.work_order_id FROM public.schedules s WHERE pr.schedule_id = s.id AND pr.work_order_id IS NULL;
ALTER TABLE public.production_runs ALTER COLUMN schedule_id DROP NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_runs_schedule_or_work_order') THEN
    ALTER TABLE public.production_runs ADD CONSTRAINT production_runs_schedule_or_work_order CHECK (schedule_id IS NOT NULL OR work_order_id IS NOT NULL);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS production_runs_work_order_id_idx ON public.production_runs (work_order_id);
DROP POLICY IF EXISTS "Org members manage production_runs" ON public.production_runs;
CREATE POLICY "Org members manage production_runs" ON public.production_runs FOR ALL
  USING ((work_order_id IS NOT NULL AND work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
    OR (schedule_id IS NOT NULL AND schedule_id IN (SELECT s.id FROM public.schedules s JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id())))
  WITH CHECK ((work_order_id IS NOT NULL AND work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
    OR (schedule_id IS NOT NULL AND schedule_id IN (SELECT s.id FROM public.schedules s JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id())));
DROP POLICY IF EXISTS "Org members manage production_logs" ON public.production_logs;
CREATE POLICY "Org members manage production_logs" ON public.production_logs FOR ALL
  USING (production_run_id IN (SELECT pr.id FROM public.production_runs pr WHERE
    (pr.work_order_id IS NOT NULL AND pr.work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
    OR (pr.schedule_id IS NOT NULL AND pr.schedule_id IN (SELECT s.id FROM public.schedules s JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))))
  WITH CHECK (production_run_id IN (SELECT pr.id FROM public.production_runs pr WHERE
    (pr.work_order_id IS NOT NULL AND pr.work_order_id IN (SELECT wo.id FROM public.work_orders wo JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
    OR (pr.schedule_id IS NOT NULL AND pr.schedule_id IN (SELECT s.id FROM public.schedules s JOIN public.work_orders wo ON s.work_order_id = wo.id JOIN public.products p ON wo.product_id = p.id WHERE p.organization_id = public.current_user_organization_id()))));

-- 14. User invites, roles, is_active (014)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitee_name TEXT,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_org ON public.user_invites(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(invite_token);
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can manage invites" ON public.user_invites;
CREATE POLICY "Org members can manage invites" ON public.user_invites FOR ALL
  USING (organization_id IN (SELECT organization_id FROM public.app_users WHERE id = auth.uid() AND organization_id IS NOT NULL))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.app_users WHERE id = auth.uid() AND organization_id IS NOT NULL));
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- 15. Demands, Calendars, Maintenance, Quality Gates, Exceptions (015)
CREATE TABLE IF NOT EXISTS public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL DEFAULT 'customer_order',
  notes TEXT,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage demands" ON public.demands;
CREATE POLICY "Org members manage demands" ON public.demands FOR ALL USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());
CREATE INDEX IF NOT EXISTS demands_org_due_idx ON public.demands (organization_id, due_date);
CREATE INDEX IF NOT EXISTS demands_status_idx ON public.demands (status);

CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plant_id, date)
);
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage calendars" ON public.calendars;
CREATE POLICY "Org members manage calendars" ON public.calendars FOR ALL
  USING (plant_id IN (SELECT id FROM public.plants WHERE organization_id = public.current_user_organization_id()))
  WITH CHECK (plant_id IN (SELECT id FROM public.plants WHERE organization_id = public.current_user_organization_id()));
CREATE INDEX IF NOT EXISTS calendars_plant_date_idx ON public.calendars (plant_id, date);

CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage maintenance_windows" ON public.maintenance_windows;
CREATE POLICY "Org members manage maintenance_windows" ON public.maintenance_windows FOR ALL
  USING (resource_id IN (SELECT r.id FROM public.resources r JOIN public.work_centers wc ON r.work_center_id = wc.id JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()))
  WITH CHECK (resource_id IN (SELECT r.id FROM public.resources r JOIN public.work_centers wc ON r.work_center_id = wc.id JOIN public.plants p ON wc.plant_id = p.id WHERE p.organization_id = public.current_user_organization_id()));
CREATE INDEX IF NOT EXISTS maintenance_windows_resource_time_idx ON public.maintenance_windows (resource_id, start_time, end_time);

CREATE TABLE IF NOT EXISTS public.quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'inspection',
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quality_gates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage quality_gates" ON public.quality_gates;
CREATE POLICY "Org members manage quality_gates" ON public.quality_gates FOR ALL USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());
CREATE INDEX IF NOT EXISTS quality_gates_org_seq_idx ON public.quality_gates (organization_id, sequence);

CREATE TABLE IF NOT EXISTS public.exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage exceptions" ON public.exceptions;
CREATE POLICY "Org members manage exceptions" ON public.exceptions FOR ALL USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());
CREATE INDEX IF NOT EXISTS exceptions_org_type_idx ON public.exceptions (organization_id, type);
CREATE INDEX IF NOT EXISTS exceptions_occurred_idx ON public.exceptions (occurred_at);

-- Done
SELECT 'Bootstrap complete. Schema ready.' AS status;

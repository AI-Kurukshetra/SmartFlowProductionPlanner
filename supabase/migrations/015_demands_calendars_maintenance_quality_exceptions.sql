-- ============================================
-- Demands, Calendars, Maintenance Windows, Quality Gates, Exceptions
-- Migration 015
-- ============================================

-- ============================================
-- 1. DEMANDS (customer orders, forecasts → work order creation)
-- ============================================

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
CREATE POLICY "Org members manage demands" ON public.demands FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE INDEX IF NOT EXISTS demands_org_due_idx ON public.demands (organization_id, due_date);
CREATE INDEX IF NOT EXISTS demands_status_idx ON public.demands (status);

-- ============================================
-- 2. CALENDARS (plant holidays, working days for scheduling)
-- ============================================

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
  USING (
    plant_id IN (
      SELECT id FROM public.plants
      WHERE organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    plant_id IN (
      SELECT id FROM public.plants
      WHERE organization_id = public.current_user_organization_id()
    )
  );

CREATE INDEX IF NOT EXISTS calendars_plant_date_idx ON public.calendars (plant_id, date);

-- ============================================
-- 3. MAINTENANCE WINDOWS (resource unavailable for scheduling)
-- ============================================

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
  USING (
    resource_id IN (
      SELECT r.id FROM public.resources r
      JOIN public.work_centers wc ON r.work_center_id = wc.id
      JOIN public.plants p ON wc.plant_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    resource_id IN (
      SELECT r.id FROM public.resources r
      JOIN public.work_centers wc ON r.work_center_id = wc.id
      JOIN public.plants p ON wc.plant_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

CREATE INDEX IF NOT EXISTS maintenance_windows_resource_time_idx
  ON public.maintenance_windows (resource_id, start_time, end_time);

-- ============================================
-- 4. QUALITY GATES (inspection points in production flow)
-- ============================================

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
CREATE POLICY "Org members manage quality_gates" ON public.quality_gates FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE INDEX IF NOT EXISTS quality_gates_org_seq_idx ON public.quality_gates (organization_id, sequence);

-- ============================================
-- 5. EXCEPTIONS (downtime, deviations, alerts)
-- ============================================

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
CREATE POLICY "Org members manage exceptions" ON public.exceptions FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE INDEX IF NOT EXISTS exceptions_org_type_idx ON public.exceptions (organization_id, type);
CREATE INDEX IF NOT EXISTS exceptions_occurred_idx ON public.exceptions (occurred_at);

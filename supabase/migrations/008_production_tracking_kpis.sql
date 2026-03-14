-- ============================================
-- Production Tracking + Dashboard KPIs
-- Run in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.app_users WHERE id = auth.uid() LIMIT 1; $$;

-- ============================================
-- 1. PRODUCTION TRACKING
-- ============================================

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

ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage production_runs" ON public.production_runs;
CREATE POLICY "Org members manage production_runs" ON public.production_runs FOR ALL
  USING (
    schedule_id IN (
      SELECT s.id FROM public.schedules s
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    schedule_id IN (
      SELECT s.id FROM public.schedules s
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "Org members manage production_logs" ON public.production_logs;
CREATE POLICY "Org members manage production_logs" ON public.production_logs FOR ALL
  USING (
    production_run_id IN (
      SELECT pr.id FROM public.production_runs pr
      JOIN public.schedules s ON pr.schedule_id = s.id
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    production_run_id IN (
      SELECT pr.id FROM public.production_runs pr
      JOIN public.schedules s ON pr.schedule_id = s.id
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

-- ============================================
-- 2. DASHBOARD KPIs
-- ============================================

CREATE TABLE IF NOT EXISTS public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage kpis" ON public.kpis;
CREATE POLICY "Org members manage kpis" ON public.kpis FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

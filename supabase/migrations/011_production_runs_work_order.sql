-- Create production_runs and production_logs if they don't exist (008 may not have run)
CREATE TABLE IF NOT EXISTS public.production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT production_runs_schedule_or_work_order CHECK (schedule_id IS NOT NULL OR work_order_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id UUID NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- If table already existed (from 008), add work_order_id and relax schedule_id
ALTER TABLE public.production_runs
  ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE;

ALTER TABLE public.production_runs
  ALTER COLUMN schedule_id DROP NOT NULL;

ALTER TABLE public.production_runs
  DROP CONSTRAINT IF EXISTS production_runs_schedule_or_work_order;

ALTER TABLE public.production_runs
  ADD CONSTRAINT production_runs_schedule_or_work_order
  CHECK (schedule_id IS NOT NULL OR work_order_id IS NOT NULL);

-- RLS: allow access when schedule_id or work_order_id belongs to org
DROP POLICY IF EXISTS "Org members manage production_runs" ON public.production_runs;
CREATE POLICY "Org members manage production_runs" ON public.production_runs FOR ALL
  USING (
    schedule_id IN (
      SELECT s.id FROM public.schedules s
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
    OR work_order_id IN (
      SELECT wo.id FROM public.work_orders wo
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
    OR work_order_id IN (
      SELECT wo.id FROM public.work_orders wo
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

-- production_logs: allow access when run is via schedule or work_order
DROP POLICY IF EXISTS "Org members manage production_logs" ON public.production_logs;
CREATE POLICY "Org members manage production_logs" ON public.production_logs FOR ALL
  USING (
    production_run_id IN (
      SELECT pr.id FROM public.production_runs pr
      LEFT JOIN public.schedules s ON pr.schedule_id = s.id
      JOIN public.work_orders wo ON wo.id = COALESCE(pr.work_order_id, s.work_order_id)
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    production_run_id IN (
      SELECT pr.id FROM public.production_runs pr
      LEFT JOIN public.schedules s ON pr.schedule_id = s.id
      JOIN public.work_orders wo ON wo.id = COALESCE(pr.work_order_id, s.work_order_id)
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

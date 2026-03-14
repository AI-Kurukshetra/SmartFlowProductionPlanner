-- Run in Supabase SQL Editor (same as migrations/011_production_runs_work_order.sql)

ALTER TABLE public.production_runs
  ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE;

UPDATE public.production_runs pr
SET work_order_id = s.work_order_id
FROM public.schedules s
WHERE pr.schedule_id = s.id AND pr.work_order_id IS NULL;

ALTER TABLE public.production_runs ALTER COLUMN schedule_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'production_runs_schedule_or_work_order'
  ) THEN
    ALTER TABLE public.production_runs
      ADD CONSTRAINT production_runs_schedule_or_work_order
      CHECK (schedule_id IS NOT NULL OR work_order_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS production_runs_work_order_id_idx ON public.production_runs (work_order_id);

DROP POLICY IF EXISTS "Org members manage production_runs" ON public.production_runs;
CREATE POLICY "Org members manage production_runs" ON public.production_runs FOR ALL
  USING (
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT wo.id FROM public.work_orders wo
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    ))
    OR (schedule_id IS NOT NULL AND schedule_id IN (
      SELECT s.id FROM public.schedules s
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    ))
  )
  WITH CHECK (
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT wo.id FROM public.work_orders wo
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    ))
    OR (schedule_id IS NOT NULL AND schedule_id IN (
      SELECT s.id FROM public.schedules s
      JOIN public.work_orders wo ON s.work_order_id = wo.id
      JOIN public.products p ON wo.product_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    ))
  );

DROP POLICY IF EXISTS "Org members manage production_logs" ON public.production_logs;
CREATE POLICY "Org members manage production_logs" ON public.production_logs FOR ALL
  USING (
    production_run_id IN (
      SELECT pr.id FROM public.production_runs pr
      WHERE
        (pr.work_order_id IS NOT NULL AND pr.work_order_id IN (
          SELECT wo.id FROM public.work_orders wo
          JOIN public.products p ON wo.product_id = p.id
          WHERE p.organization_id = public.current_user_organization_id()
        ))
        OR (pr.schedule_id IS NOT NULL AND pr.schedule_id IN (
          SELECT s.id FROM public.schedules s
          JOIN public.work_orders wo ON s.work_order_id = wo.id
          JOIN public.products p ON wo.product_id = p.id
          WHERE p.organization_id = public.current_user_organization_id()
        ))
    )
  )
  WITH CHECK (
    production_run_id IN (
      SELECT pr.id FROM public.production_runs pr
      WHERE
        (pr.work_order_id IS NOT NULL AND pr.work_order_id IN (
          SELECT wo.id FROM public.work_orders wo
          JOIN public.products p ON wo.product_id = p.id
          WHERE p.organization_id = public.current_user_organization_id()
        ))
        OR (pr.schedule_id IS NOT NULL AND pr.schedule_id IN (
          SELECT s.id FROM public.schedules s
          JOIN public.work_orders wo ON s.work_order_id = wo.id
          JOIN public.products p ON wo.product_id = p.id
          WHERE p.organization_id = public.current_user_organization_id()
        ))
    )
  );

-- Inventory daily snapshots for date-wise Gantt chart
CREATE TABLE IF NOT EXISTS public.inventory_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (inventory_id, log_date)
);

CREATE INDEX IF NOT EXISTS inventory_daily_log_date_idx ON public.inventory_daily (log_date);
CREATE INDEX IF NOT EXISTS inventory_daily_inventory_id_idx ON public.inventory_daily (inventory_id);

ALTER TABLE public.inventory_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage inventory_daily" ON public.inventory_daily;
CREATE POLICY "Org members manage inventory_daily" ON public.inventory_daily FOR ALL
  USING (
    inventory_id IN (
      SELECT inv.id FROM public.inventory inv
      JOIN public.plants p ON inv.plant_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    inventory_id IN (
      SELECT inv.id FROM public.inventory inv
      JOIN public.plants p ON inv.plant_id = p.id
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

-- Ensure scheduler table exists for Work Order -> Machine(Resource) -> Time Slot flow
-- Machine is modeled as `resource_id` referencing public.resources(id)

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Keep status bounded to known values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_status_check'
  ) THEN
    ALTER TABLE public.schedules
      ADD CONSTRAINT schedules_status_check
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS schedules_resource_start_idx
  ON public.schedules (resource_id, start_time);

CREATE INDEX IF NOT EXISTS schedules_work_order_idx
  ON public.schedules (work_order_id);

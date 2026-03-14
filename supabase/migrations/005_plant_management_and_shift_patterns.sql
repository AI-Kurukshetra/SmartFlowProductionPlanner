-- Plant Management: plants(location, timezone) + shift_patterns

-- 1) Extend plants with required management fields
ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Backfill location from legacy address when available
UPDATE public.plants
SET location = COALESCE(location, address)
WHERE location IS NULL AND address IS NOT NULL;

-- 2) Shift patterns per plant
CREATE TABLE IF NOT EXISTS public.shift_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_patterns ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies for shift_patterns scoped to user's organization
DROP POLICY IF EXISTS "Org members manage shift_patterns" ON public.shift_patterns;
CREATE POLICY "Org members manage shift_patterns"
  ON public.shift_patterns FOR ALL
  USING (
    plant_id IN (
      SELECT p.id
      FROM public.plants p
      WHERE p.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    plant_id IN (
      SELECT p.id
      FROM public.plants p
      WHERE p.organization_id = public.current_user_organization_id()
    )
  );

-- 4) Helpful uniqueness guard
CREATE UNIQUE INDEX IF NOT EXISTS shift_patterns_plant_name_unique
  ON public.shift_patterns (plant_id, name);

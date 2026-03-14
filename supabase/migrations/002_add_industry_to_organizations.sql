-- Add industry column to organizations (run if table already exists)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS industry TEXT;

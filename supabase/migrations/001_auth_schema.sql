-- ============================================
-- Smart Product Planner - Auth Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create user role enum
CREATE TYPE user_role AS ENUM ('admin', 'planner', 'supervisor', 'operator');

-- 2. Organizations table (for organization_id FK)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. App users table (extends Supabase auth.users)
-- Links to auth.users via id, stores role & org
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Helper: resolve current user's organization without recursive policy evaluation
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.app_users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated;

-- 5. RLS Policies for app_users
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.app_users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users in their org (optional - adjust as needed)
CREATE POLICY "Users can read org members"
  ON public.app_users FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.current_user_organization_id()
  );

-- Allow insert for new signups (trigger handles this)
CREATE POLICY "Allow insert for authenticated"
  ON public.app_users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own name
CREATE POLICY "Users can update own profile"
  ON public.app_users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. RLS for organizations
CREATE POLICY "Anyone can read organizations"
  ON public.organizations FOR SELECT
  USING (true);

-- 7. Trigger: Auto-create app_users row when user signs up
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

-- Drop trigger if exists (for re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Optional: Seed a default organization (run separately if needed)
-- INSERT INTO public.organizations (id, name)
-- VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Organization')
-- ON CONFLICT (id) DO NOTHING;

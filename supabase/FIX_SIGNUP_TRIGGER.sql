-- ============================================
-- Fix "Database error saving new user" on signup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Ensure user_role enum exists (skip if already exists)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'planner', 'supervisor', 'operator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ensure organizations table exists
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Ensure app_users table exists
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add unique constraint on email if not exists (skip if already exists)
DO $$ BEGIN
  ALTER TABLE public.app_users ADD CONSTRAINT app_users_email_key UNIQUE (email);
EXCEPTION
  WHEN OTHERS THEN NULL;  -- constraint already exists
END $$;

-- 5. Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 5.1 Helper: resolve current user's organization without recursive policy evaluation
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

-- 6. Drop existing policies to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Users can read org members" ON public.app_users;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can read organizations" ON public.organizations;

CREATE POLICY "Users can read own profile" ON public.app_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can read org members" ON public.app_users FOR SELECT USING (
  organization_id IS NOT NULL AND organization_id = public.current_user_organization_id()
);
CREATE POLICY "Allow insert for authenticated" ON public.app_users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.app_users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Anyone can read organizations" ON public.organizations FOR SELECT USING (true);

-- 7. Recreate trigger function (SECURITY DEFINER bypasses RLS for function owner)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  user_role_val user_role;
  user_email TEXT;
BEGIN
  user_email := COALESCE(NULLIF(TRIM(NEW.email), ''), NEW.id::text || '@temp.local');
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(user_email, '@', 1)
  );
  IF user_name = '' OR user_name IS NULL THEN
    user_name := 'User';
  END IF;

  user_role_val := 'operator';
  IF NEW.raw_user_meta_data->>'role' IN ('admin', 'planner', 'supervisor', 'operator') THEN
    user_role_val := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.app_users (id, email, name, role)
  VALUES (NEW.id, user_email, user_name, user_role_val);

  RETURN NEW;
END;
$$;

-- 8. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

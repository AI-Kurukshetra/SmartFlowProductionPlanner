-- Fix RLS recursion on public.app_users (Postgres error 42P17)
-- Root cause: policy "Users can read org members" queried public.app_users
-- from inside its own USING expression.

-- Helper returns current user's organization_id without triggering table RLS recursion.
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

-- Replace recursive policy with function-based policy.
DROP POLICY IF EXISTS "Users can read org members" ON public.app_users;
CREATE POLICY "Users can read org members"
  ON public.app_users FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.current_user_organization_id()
  );

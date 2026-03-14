-- Run once in Supabase → SQL Editor if you see "no app profile" when opening Users tab.
-- Creates app_users for every auth user that does not already have a row.
-- Fixes: "Unauthorized: no app profile"

-- Ensure is_active column exists (RBAC migrations add it)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

INSERT INTO public.app_users (id, email, name, role, is_active)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
    split_part(COALESCE(u.email, ''), '@', 1),
    'User'
  ),
  CASE
    WHEN u.raw_user_meta_data->>'role' IN ('admin', 'planner', 'supervisor', 'operator')
    THEN (u.raw_user_meta_data->>'role')::user_role
    ELSE 'operator'::user_role
  END,
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.app_users a WHERE a.id = u.id)
ON CONFLICT (id) DO NOTHING;

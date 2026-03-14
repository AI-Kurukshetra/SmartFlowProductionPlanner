-- ============================================
-- Link your user to Demo organization
-- Run this in Supabase SQL Editor if you can't see seed data
-- Replace YOUR_EMAIL with your actual login email
-- ============================================

UPDATE public.app_users
SET organization_id = (
  SELECT id FROM public.organizations
  WHERE name = 'Demo Manufacturing Co'
  LIMIT 1
)
WHERE email = 'YOUR_EMAIL';

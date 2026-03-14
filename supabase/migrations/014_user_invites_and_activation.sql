-- User invites and activation (required for Admin → Invite User)
-- Run after 012_role_management_rbac.sql and 013_user_roles.sql
-- If roles table doesn't exist, run 012 first.

-- Ensure roles table exists (from 012)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_invites: tracks invite tokens and status
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitee_name TEXT,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_org ON public.user_invites(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(invite_token);

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Only org admins/managers can manage invites (simplified: authenticated users in same org)
CREATE POLICY "Org members can manage invites"
  ON public.user_invites
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.app_users WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.app_users WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- Add is_active and deactivated_at to app_users if missing (from 012)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

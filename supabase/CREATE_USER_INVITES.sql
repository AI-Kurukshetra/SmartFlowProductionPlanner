-- Run in Supabase → SQL Editor if you get "Could not find table 'public.user_invites'"
-- Creates user_invites table and roles (if missing) for the Invite User feature.

-- Roles table (needed for invite role_id)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User invites table
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

CREATE POLICY "Org members can manage invites"
  ON public.user_invites FOR ALL
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

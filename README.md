# Smart Product Planner

Next.js + Supabase starter project.

## Quick start

1. Install dependencies (already done):
   `npm install`
2. Create local env file:
   `copy .env.example .env.local` (or edit `.env` — same variables)
3. In Dashboard → **API**: paste **anon** JWT into `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **service_role** into `SUPABASE_SERVICE_ROLE_KEY`. URL is already set in `.env.example` for this project ref.
4. If login works but app says **no app profile**, run `supabase/BACKFILL_APP_USERS.sql` in the SQL Editor once.
5. If **Invite User** fails with "Could not find table user_invites", run `supabase/CREATE_USER_INVITES.sql` in the SQL Editor.
6. Run dev server:
   `npm run dev`

## “Unauthorized” / missing `app_users` row

If `requirePermission` fails after login, the auth user often has **no row in `public.app_users`** (signup trigger not installed or failed).

1. Set **`SUPABASE_SERVICE_ROLE_KEY`** in `.env.local` and restart dev — the app will auto-create the row on first RBAC check.
2. Or run in **SQL Editor** (replace UUID/email/name):

```sql
INSERT INTO public.app_users (id, email, name, role)
SELECT id, COALESCE(email, ''), COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 'operator'::user_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.app_users)
ON CONFLICT (id) DO NOTHING;
```

If your table has `is_active`, add `is_active = true` to the insert list or run migrations `014_*` first.

## Supabase helpers

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`

## Supabase SQL order

Run these in Supabase SQL Editor:

1. `supabase/CREATE_TABLES.sql`
2. `supabase/ONBOARDING_TABLES.sql`
3. `supabase/migrations/004_fix_app_users_rls_recursion.sql`
4. `supabase/migrations/012_role_management_rbac.sql`
5. `supabase/migrations/013_user_roles.sql`
6. `supabase/migrations/014_user_invites_and_activation.sql`
7. `supabase/SEED_DATA.sql`

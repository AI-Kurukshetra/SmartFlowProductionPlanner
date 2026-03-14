# Smart Product Planner

Next.js + Supabase starter project.

## Quick start

1. Install dependencies (already done):
   `npm install`
2. Create local env file:
   `copy .env.example .env.local`
3. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
4. Run dev server:
   `npm run dev`

## Supabase helpers

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`

## Supabase SQL order

Run these in Supabase SQL Editor:

1. `supabase/CREATE_TABLES.sql`
2. `supabase/ONBOARDING_TABLES.sql`
3. `supabase/migrations/004_fix_app_users_rls_recursion.sql`
4. `supabase/SEED_DATA.sql`

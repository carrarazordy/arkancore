# Supabase Setup

## 1. Apply the schema
Run the SQL in [`supabase/migrations/20260317150000_arkan_core_schema.sql`](/F:/Arkana%20Lab/App/arkancore/supabase/migrations/20260317150000_arkan_core_schema.sql) first, then run [`supabase/migrations/20260317154000_admin_roles.sql`](/F:/Arkana%20Lab/App/arkancore/supabase/migrations/20260317154000_admin_roles.sql).

These migrations create:
- `profiles`
- `projects`
- `tasks`
- `neural_archive_nodes`
- `events`
- `expedition_sectors`
- `expedition_items`
- `admin_allowlist`
- `updated_at` triggers
- auth profile sync trigger from `auth.users`
- RLS policies for per-user isolation
- admin policies for the allowlisted operator
- realtime publication for `events`

## 2. General admin bootstrap
The email `victorkcarrara@gmail.com` is allowlisted as `GENERAL_ADMIN` in the admin migration.

What this means:
- when this user signs up
- confirms the email
- and the auth sync trigger runs

The corresponding `profiles.app_role` becomes `admin` automatically.

No password is stored in the repository or in the SQL files.

## 3. Auth configuration
Open Supabase Dashboard -> Authentication -> Providers -> Email and set:
- `Enable Email provider`: ON
- `Confirm email`: ON

## 4. Redirect URLs
Open Supabase Dashboard -> Authentication -> URL Configuration and configure:
- `Site URL`
  - local: `http://localhost:3000`
  - production: your deployed frontend base URL
- `Redirect URLs`
  - `http://localhost:3000/login`
  - `http://localhost:3000/dashboard`
  - your production `/login`
  - your production `/dashboard`

The current frontend sends confirmation links back to `/login`.

## 5. Environment variables
The frontend is already prepared to read:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`

Local values are in [`.env.local`](/F:/Arkana%20Lab/App/arkancore/.env.local).

## 6. Current app compatibility
The following app areas are compatible with this schema now:
- auth via Supabase
- email confirmation flow with resend link
- admin bootstrap via allowlist
- `Calendar` with `events`
- `Expeditions` with `expedition_sectors` and `expedition_items`
- `Archive` with `tasks` and `projects`

The following still use local Zustand state and will need repository-side persistence work later:
- dashboard projects flow
- operations tasks flow
- notes tree persistence
- search index source hydration from DB instead of local stores

## 7. Recommended validation order
1. Run both migrations
2. Sign up with the admin email
3. Confirm the email from inbox
4. Log in
5. Check `profiles.app_role = 'admin'`
6. Create an event in `Calendar`
7. Create a sector/item in `Expeditions`

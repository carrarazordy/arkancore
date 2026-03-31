# Vercel Setup

## 1. Import the repository
Import [`carrarazordy/arkancore`](https://github.com/carrarazordy/arkancore) into Vercel.

The project is already prepared for Vite builds through [`vercel.json`](/F:/Arkana%20Lab/App/arkancore/vercel.json).

## 2. Build settings
Use:
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## 3. Environment variables
Add these variables in Vercel Project Settings -> Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional compatibility fallback:
- `VITE_SUPABASE_ANON_KEY`

If you use Gemini or any other external service later, add those keys separately. The current app runtime requires Supabase first.

## 4. Supabase auth URLs
After the Vercel project has a production domain, open Supabase Dashboard -> Authentication -> URL Configuration and set:

- `Site URL`
  - `https://your-vercel-domain.vercel.app`

- `Redirect URLs`
  - `https://your-vercel-domain.vercel.app/login`
  - `https://your-vercel-domain.vercel.app/dashboard`
  - `https://your-vercel-domain.vercel.app/settings`

`/settings` is required for the password recovery flow.

## 5. SPA routing
This project uses `BrowserRouter`. Vercel fallback routing is already configured so deep links such as:
- `/dashboard`
- `/calendar`
- `/search`
- `/settings`

resolve back to `index.html` instead of returning `404`.

## 6. Recommended first deployment check
1. Deploy to Vercel.
2. Open `/login`.
3. Sign in with a confirmed Supabase user.
4. Open `/settings` and trigger password reset.
5. Open `/calendar` and verify event load.
6. Open `/expeditions` and verify manifest load.

## 7. Known follow-up work
The deployment is ready, but these are still app-level follow-ups:
- move `projects`, `tasks`, and `notes` from local Zustand state to Supabase
- reduce the large production bundle
- run a full manual QA pass on mobile and desktop

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Arkan Core

Tactical operating workspace built with React, Vite and Supabase.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the required environment variables in [`.env.local`](/F:/Arkana%20Lab/App/arkancore/.env.local)
   For a local UI test without auth, add `VITE_BYPASS_AUTH="true"` and optionally customize `VITE_BYPASS_AUTH_EMAIL`.
3. Run the app:
   `npm run dev`

## Deployment

- Supabase schema and auth setup: [docs/supabase-setup.md](/F:/Arkana%20Lab/App/arkancore/docs/supabase-setup.md)
- Vercel deployment setup: [docs/vercel-setup.md](/F:/Arkana%20Lab/App/arkancore/docs/vercel-setup.md)

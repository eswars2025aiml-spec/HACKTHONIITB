# Life RPG project notes

This project intentionally stays on its imported Vite + React + TypeScript + Tailwind + Supabase stack. Do not migrate it to Next.js or replace the existing architecture.

## Running

- Development command: `npm run dev`
- Preview port: `5000`
- Vite is configured to accept Replit's proxied preview hostnames.
- Required environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Apply all files in `supabase/migrations/` to the connected Supabase project before testing authenticated flows.
- Laptop Docker support is provided by `Dockerfile` and `docker-compose.yml`; it serves the built app through Nginx on host port 8080 by default.

## Data and security

Quest rewards, streaks, achievements, shop purchases, and inventory equipment are persisted in Supabase. Row Level Security scopes records to the authenticated user, and reward/economy mutations use database functions rather than trusting the browser.
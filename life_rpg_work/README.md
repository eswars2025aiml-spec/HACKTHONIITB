# Life RPG

Life RPG is a Vite + React + TypeScript productivity game backed by Supabase. Create real-life quests, complete them for XP and gold, improve attributes, maintain streaks, unlock achievements, and spend gold on cosmetic items.

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env` and set the Supabase project URL and anon key.
3. Apply the SQL files in `supabase/migrations/` to the same Supabase project.
4. Run:

```bash
npm install
npm run dev
```

The Replit preview uses the configured `Start application` workflow on port 5000.

## Run with Docker Compose

Install Docker Desktop, then create a local `.env` file from `.env.example` and
fill in the two Supabase values. Build and start the production container:

```bash
docker compose up --build -d
```

Open `http://localhost:8080`. To use another host port:

```bash
APP_PORT=9000 docker compose up --build -d
```

The Supabase URL and anon key are public frontend configuration values and are
embedded during the Vite build. Do not pass a Supabase service-role key to this
container. Apply the SQL migrations to your Supabase project separately.

Stop the container with:

```bash
docker compose down
```

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

Supabase Row Level Security limits user data to the signed-in owner. XP, gold, streaks, completions, purchases, and equipment changes are performed by server-side database functions.
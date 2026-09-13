# Life RPG Docker Setup

This adds Docker infrastructure without changing the existing Life RPG application code.

## Services

- `frontend`: existing Vite + React application, built with Node and served by Nginx.
- `backend`: FastAPI/Python service with its own `requirements.txt`.
- `database`: PostgreSQL 16 with a persistent Docker volume.

## Important architecture note

The existing frontend uses `@supabase/supabase-js` and the existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values. Those application files are intentionally unchanged.

The local PostgreSQL container is the database for the new backend infrastructure. It does not replace the existing hosted Supabase Auth/API layer. Replacing Supabase completely would require changing the frontend data/auth implementation, which this setup deliberately does not do.

The app itself (auth, quests, XP, shop, everything) does not call `backend` or `database` at all today — the frontend only talks to Supabase. `backend`/`database` are included so this infrastructure exists if you build something on top of it later (an admin API, a leaderboard job, etc.), but nothing in the running app currently depends on them, so their startup no longer blocks the frontend (see below).

## Start

Copy `.env.example` to `.env`, keep your current Supabase values, then run:

```bash
docker compose up --build -d
```

Startup:

1. PostgreSQL starts, runs its init scripts on first volume creation, and passes its health check.
2. Backend starts, checks the database, and passes its health check.
3. Frontend starts independently of the above — it only needs its own build output and Supabase, so a problem with `backend` or `database` can't prevent the real app from coming up.

## URLs

- App: `http://localhost:8080`
- Backend: `http://localhost:8000/api`
- Health through frontend proxy: `http://localhost:8080/api/health`
- Direct backend health: `http://localhost:8000/api/health`

Expected health response:

```json
{"status":"ok","backend":"connected","database":"connected"}
```

## Useful commands

```bash
docker compose ps
docker compose logs -f
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f database
docker compose down
```

To delete the local PostgreSQL data too:

```bash
docker compose down -v
```

Do not run `down -v` if you need to keep the local database volume.

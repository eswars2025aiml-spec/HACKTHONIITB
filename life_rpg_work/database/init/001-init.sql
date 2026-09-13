-- Local PostgreSQL bootstrap for the Docker backend.
-- The existing Life RPG frontend remains connected to Supabase exactly as-is.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS docker_bootstrap (
  id BIGSERIAL PRIMARY KEY,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT NOT NULL DEFAULT 'Life RPG PostgreSQL initialized by Docker Compose'
);

INSERT INTO docker_bootstrap (note)
SELECT 'Life RPG PostgreSQL initialized by Docker Compose'
WHERE NOT EXISTS (SELECT 1 FROM docker_bootstrap);

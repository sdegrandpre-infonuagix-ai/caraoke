-- Story 2.2: users — system-of-record identity (FR1). UUID v7 PKs, snake_case columns.
-- Law 25 / GDPR deletion (FR6) cascades from this table in later migrations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub   TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  -- Identity provider used at first sign-in: 'apple' | 'google' | 'cognito'.
  auth_provider TEXT NOT NULL DEFAULT 'cognito',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

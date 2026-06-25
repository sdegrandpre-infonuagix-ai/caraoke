-- Story 2.2: users — system-of-record identity (FR1). UUID PKs, snake_case columns.
-- Law 25 / GDPR account deletion (FR6, Story 2.3): deleting a users row must remove ALL of a
-- user's personal data. CONVENTION: every table holding personal data MUST declare its
-- user_id FK as `REFERENCES users(id) ON DELETE CASCADE`, so DELETE FROM users cascades.

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

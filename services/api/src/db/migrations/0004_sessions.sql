-- Story 3.1: sessions — a duet session created by a host, with a single-use invite token and
-- a human-typeable pairing code (FR7). The invite encodes the session and expires after a
-- defined window. host_user_id cascades on user deletion (FR6).

CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SessionStateMachine state (shared): idle|pairing|ready|playing|reconnecting|ended.
  status       TEXT NOT NULL DEFAULT 'pairing',
  pairing_code TEXT NOT NULL UNIQUE,
  invite_token TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_pairing_code ON sessions (pairing_code);
CREATE INDEX IF NOT EXISTS idx_sessions_invite_token ON sessions (invite_token);
CREATE INDEX IF NOT EXISTS idx_sessions_host_user_id ON sessions (host_user_id);

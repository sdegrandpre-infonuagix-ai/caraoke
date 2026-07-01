-- Story 2.4: spotify_accounts — links a Caraoke user to their Spotify account + Premium
-- status (FR2). One Spotify link per user. Personal data → ON DELETE CASCADE (FR6).

CREATE TABLE IF NOT EXISTS spotify_accounts (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spotify_user_id TEXT NOT NULL,
  product         TEXT NOT NULL,
  is_premium      BOOLEAN NOT NULL,
  display_name    TEXT,
  -- Refresh token for later playback control; encrypted at rest via Aurora KMS (NFR6).
  refresh_token   TEXT,
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

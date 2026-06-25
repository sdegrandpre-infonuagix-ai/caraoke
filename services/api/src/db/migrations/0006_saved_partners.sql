-- Story 3.3: saved_partners — a directional "known partner" link so re-pairing is effortless
-- (FR9). Both sides FK to users with ON DELETE CASCADE (FR6). Composite PK prevents dupes.

CREATE TABLE IF NOT EXISTS saved_partners (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, partner_user_id),
  CHECK (user_id <> partner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_partners_user_id ON saved_partners (user_id);

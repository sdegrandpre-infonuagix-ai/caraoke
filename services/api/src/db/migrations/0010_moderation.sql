-- Story 6.x: moderation — blocks + reports (FR36/FR37). Backs the pairing/discovery block-check
-- (a join is refused when either party has blocked the other) and the operator report queue.
-- Personal-data convention (see 0001): user FKs cascade on account deletion (FR6, Law 25).

CREATE TABLE IF NOT EXISTS blocks (
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_user_id, to_user_id)
);

-- isBlocked() checks both directions; the PK covers from_user_id, this covers the reverse lookup.
CREATE INDEX IF NOT EXISTS idx_blocks_to_user_id ON blocks (to_user_id);

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Keep the report if its session is deleted (audit trail); just drop the link.
  session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,
  reason          TEXT,
  -- 'pending' | 'escalated' | 'resolved'
  status          TEXT NOT NULL DEFAULT 'pending',
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

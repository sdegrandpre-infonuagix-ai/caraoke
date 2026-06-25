-- Story 3.2: a session's second singer (the joiner). A duet is two people, so a single
-- guest column suffices. ON DELETE SET NULL: if the guest deletes their account the session
-- survives (the host can re-invite); host deletion still cascades the whole session (FR6).

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS guest_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

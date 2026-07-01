-- Story 3.4: per-participant readiness for the ready-handshake (FR10). When both are ready
-- the SessionStateMachine transitions pairing -> ready (the single source of truth, UX-DR2).

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS host_ready  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS guest_ready BOOLEAN NOT NULL DEFAULT false;

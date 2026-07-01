-- Story 8.7: account suspension — operator can suspend/reinstate users (FR48).
-- suspended_at: non-null means the account is suspended; null means active.
-- Every suspension/reinstatement is auditable via updated_at.
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL;

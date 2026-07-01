-- Story 2.5: language preference on the profile (FR3). Drives UI (FR5) and the Voice-Agent
-- speech language (FR4), independent of the partner. Defaults to English; the client sets it
-- to the device locale (or the user's choice) on first run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS language_pref TEXT NOT NULL DEFAULT 'en';

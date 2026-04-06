-- TripTangle Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trips table
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT DEFAULT '' CHECK (char_length(description) <= 500),
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  creator_member_id UUID,
  locked_dates_start DATE,
  locked_dates_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (date_range_end >= date_range_start),
  CONSTRAINT valid_locked_range CHECK (
    (locked_dates_start IS NULL AND locked_dates_end IS NULL) OR
    (locked_dates_start IS NOT NULL AND locked_dates_end IS NOT NULL AND locked_dates_end >= locked_dates_start)
  )
);

-- Members table
-- No compound unique constraints — deduplication is handled in application code.
-- The same user_id can appear in multiple trips (one row per trip membership).
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('pending', 'joined')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Availability table
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'maybe', 'unavailable')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, trip_id, date)
);

-- AI Recommendations table
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  recommendation_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0 AND option_index <= 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, trip_id)
);

-- Indexes
CREATE INDEX idx_members_trip_id ON members(trip_id);
CREATE INDEX idx_availability_trip_id ON availability(trip_id);
CREATE INDEX idx_availability_member_trip ON availability(member_id, trip_id);
CREATE INDEX idx_votes_trip_id ON votes(trip_id);
CREATE INDEX idx_ai_recommendations_trip_id ON ai_recommendations(trip_id);

-- RLS: Enable on all tables with permissive anon policies
-- Security relies on trip ID being unguessable (12-char alphanumeric)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_trips" ON trips;
CREATE POLICY "anon_all_trips" ON trips FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_members" ON members;
CREATE POLICY "anon_all_members" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_availability" ON availability;
CREATE POLICY "anon_all_availability" ON availability FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_ai_recommendations" ON ai_recommendations;
CREATE POLICY "anon_all_ai_recommendations" ON ai_recommendations FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_votes" ON votes;
CREATE POLICY "anon_all_votes" ON votes FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime on tables that need live sync
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'availability') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE availability;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'votes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Itinerary & During-Trip Coordination
-- Run this block in Supabase SQL Editor after the schema above.
-- ─────────────────────────────────────────────────────────────────

-- Add destination to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT '';

-- Map pins (shared across all group members, realtime)
CREATE TABLE IF NOT EXISTS map_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  category TEXT NOT NULL DEFAULT 'activity'
    CHECK (category IN ('accommodation', 'restaurant', 'activity', 'other')),
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily polls
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 200),
  options JSONB NOT NULL,
  poll_date DATE,
  is_multiselect BOOLEAN NOT NULL DEFAULT FALSE,
  winning_option_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poll responses
-- Single-select: one row per (poll_id, member_id)
-- Multiselect: one row per (poll_id, member_id, option_index) — toggle pattern
CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, member_id, option_index)
);

-- AI-generated itineraries (cached, one per trip)
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_map_pins_trip_id ON map_pins(trip_id);
CREATE INDEX IF NOT EXISTS idx_polls_trip_id ON polls(trip_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON itineraries(trip_id);

-- RLS
ALTER TABLE map_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_map_pins" ON map_pins;
CREATE POLICY "anon_all_map_pins" ON map_pins FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_polls" ON polls;
CREATE POLICY "anon_all_polls" ON polls FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_poll_responses" ON poll_responses;
CREATE POLICY "anon_all_poll_responses" ON poll_responses FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_itineraries" ON itineraries;
CREATE POLICY "anon_all_itineraries" ON itineraries FOR ALL TO anon USING (true) WITH CHECK (true);

-- Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'map_pins') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE map_pins;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'polls') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE polls;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'poll_responses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE poll_responses;
  END IF;
END $$;

-- Member suggestions for itinerary regeneration
CREATE TABLE IF NOT EXISTS itinerary_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL CHECK (char_length(suggestion) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_suggestions_trip_id ON itinerary_suggestions(trip_id);
ALTER TABLE itinerary_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_itinerary_suggestions" ON itinerary_suggestions;
CREATE POLICY "anon_all_itinerary_suggestions" ON itinerary_suggestions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Budget / Expense Tracker
-- Run this block in Supabase SQL Editor after the schema above.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  category TEXT NOT NULL CHECK (category IN ('flights','hotel','food','local_travel','activity','shopping')),
  split_among JSONB NOT NULL DEFAULT '[]', -- array of member UUID strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_expenses" ON expenses;
CREATE POLICY "anon_all_expenses" ON expenses FOR ALL TO anon USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'expenses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Trip Photos
-- 1. Run this SQL block in Supabase SQL Editor
-- 2. Go to Supabase → Storage → Create bucket named "trip-photos"
--    → enable "Public bucket" → Save
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- storage path: {trip_id}/{member_id}/{timestamp}-{filename}
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_trip_photos" ON trip_photos;
CREATE POLICY "anon_all_trip_photos" ON trip_photos FOR ALL TO anon USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'trip_photos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trip_photos;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Invitations — track invite sends per channel
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'gmail', 'sms', 'copy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_trip_id ON invitations(trip_id);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_invitations" ON invitations;
CREATE POLICY "anon_all_invitations" ON invitations FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Members — add user_id + role; drop all compound unique constraints
-- Run this block in Supabase SQL Editor against the live DB.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member'));

-- Drop any compound unique constraints — only the PK (id) should be unique.
-- The same person can and should be a member of multiple trips.
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_trip_id_display_name_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_trip_id_user_id_key;

CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: Polls — add multiselect support and winner locking
-- Run this block in Supabase SQL Editor against the live DB.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_multiselect BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS winning_option_index INTEGER;

-- Switch poll_responses uniqueness from (poll_id, member_id) to
-- (poll_id, member_id, option_index) so multiselect can store multiple rows per member
ALTER TABLE poll_responses DROP CONSTRAINT IF EXISTS poll_responses_poll_id_member_id_key;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'poll_responses_unique_per_option'
  ) THEN
    ALTER TABLE poll_responses ADD CONSTRAINT poll_responses_unique_per_option
      UNIQUE (poll_id, member_id, option_index);
  END IF;
END $$;

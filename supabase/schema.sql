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
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('pending', 'joined')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, display_name)
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

CREATE POLICY "anon_all_trips" ON trips FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_members" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_availability" ON availability FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_ai_recommendations" ON ai_recommendations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_votes" ON votes FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime on tables that need live sync
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE availability;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

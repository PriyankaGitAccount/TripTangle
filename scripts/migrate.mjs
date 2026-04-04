/**
 * One-time migration — creates Plan-phase tables in Supabase.
 * Reads from .env.local (same as Next.js on localhost).
 *
 * Usage:
 *   npm run migrate
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Find it: Supabase dashboard → Project Settings → API → service_role secret
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load env files in Next.js priority order: .env.local overrides .env
function loadEnvFile(file) {
  try {
    readFileSync(resolve(root, file), 'utf8')
      .split('\n')
      .forEach((line) => {
        const eq = line.indexOf('=');
        if (eq === -1 || line.startsWith('#')) return;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (key && !(key in process.env)) process.env[key] = val;
      });
  } catch { /* file may not exist */ }
}

loadEnvFile('.env');
loadEnvFile('.env.local'); // takes priority

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL missing from .env.local');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('✗ SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  process.exit(1);
}

const SQL = `
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itinerary_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL CHECK (char_length(suggestion) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 200),
  options JSONB NOT NULL,
  poll_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id           ON itineraries(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_suggestions_trip_id ON itinerary_suggestions(trip_id);
CREATE INDEX IF NOT EXISTS idx_map_pins_trip_id              ON map_pins(trip_id);
CREATE INDEX IF NOT EXISTS idx_polls_trip_id                 ON polls(trip_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id        ON poll_responses(poll_id);

ALTER TABLE itineraries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_pins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='itineraries'           AND policyname='anon_all_itineraries')           THEN CREATE POLICY "anon_all_itineraries"           ON itineraries           FOR ALL TO anon USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='itinerary_suggestions' AND policyname='anon_all_itinerary_suggestions') THEN CREATE POLICY "anon_all_itinerary_suggestions" ON itinerary_suggestions FOR ALL TO anon USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='map_pins'              AND policyname='anon_all_map_pins')              THEN CREATE POLICY "anon_all_map_pins"              ON map_pins              FOR ALL TO anon USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='polls'                 AND policyname='anon_all_polls')                 THEN CREATE POLICY "anon_all_polls"                 ON polls                 FOR ALL TO anon USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='poll_responses'        AND policyname='anon_all_poll_responses')        THEN CREATE POLICY "anon_all_poll_responses"        ON poll_responses        FOR ALL TO anon USING (true) WITH CHECK (true); END IF;
END $$;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE map_pins;       EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE polls;          EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE poll_responses; EXCEPTION WHEN others THEN NULL; END;
END $$;
`;

console.log(`\nMigrating project: ${new URL(SUPABASE_URL).hostname.split('.')[0]} …`);

// Split into individual statements and run each via Supabase RPC
// Uses service role key to bypass RLS
const statements = SQL
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(Boolean);

let failed = 0;
for (const stmt of statements) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql: stmt + ';' }),
  });
  if (!res.ok) {
    const body = await res.text();
    // Ignore "already exists" errors — safe to rerun
    if (!body.includes('already exists') && !body.includes('duplicate')) {
      console.error(`  ✗ ${stmt.slice(0, 60)}…\n    ${body}`);
      failed++;
    }
  }
}

if (failed === 0) {
  console.log('✓ Migration complete — all Plan tables ready.\n');
} else {
  console.error(`\n✗ ${failed} statement(s) failed. Try running the SQL manually in:\n  https://supabase.com/dashboard/project/${new URL(SUPABASE_URL).hostname.split('.')[0]}/sql/new\n`);
  process.exit(1);
}

-- ============================================================
-- MIGRATION 011: Google Places integration (Beli-style search)
-- ============================================================
-- Search is powered by Google Places. Every physical location has a permanent
-- google_place_id — that's the canonical identity (no dupes, no misspellings:
-- users select a real Google location, they never type the restaurant into
-- existence). Chains are naturally distinguishable because each branch has its
-- own place_id + address. Rows are get-or-created by the places-resolve Edge
-- Function (service role) keyed on google_place_id.
--
-- Google ToS: place_id may be stored indefinitely; other fields are cached and
-- refreshed periodically (last_synced_at drives a ~30-day refresh).

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS google_place_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_types     TEXT[],
  ADD COLUMN IF NOT EXISTS google_rating    DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS google_rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS price_level      SMALLINT,       -- Google 0..4
  ADD COLUMN IF NOT EXISTS source           VARCHAR(20) DEFAULT 'seed',  -- 'seed' | 'google'
  ADD COLUMN IF NOT EXISTS last_synced_at   TIMESTAMPTZ;

-- One Rasa row per real Google location.
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_place_id
  ON restaurants(google_place_id) WHERE google_place_id IS NOT NULL;

-- Fast "is this place already on Rasa?" lookups during hybrid search.
CREATE INDEX IF NOT EXISTS idx_restaurants_source ON restaurants(source);

-- ============================================================
-- MIGRATION 007: Rasa Coins + Weekly Streak
-- ============================================================

-- ── Add streak_week_start to food_passports ─────────────────
ALTER TABLE food_passports
  ADD COLUMN IF NOT EXISTS streak_week_start DATE;

-- ── Add coins balance to food_passports ─────────────────────
ALTER TABLE food_passports
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- ── Add active_theme to users ────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_theme TEXT NOT NULL DEFAULT 'default';

-- ── Coin transactions table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS coin_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,          -- positive = earned, negative = spent
  type        VARCHAR(60) NOT NULL,      -- see CoinTransactionType in coins.ts
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_tx_user    ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_created ON coin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_type    ON coin_transactions(type);

-- ── RLS for coin_transactions ────────────────────────────────
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin transactions"
  ON coin_transactions FOR SELECT
  USING (user_id = auth_user_id());

-- Inserts go through the award_coins function (SECURITY DEFINER) so no direct INSERT policy needed

-- ── award_coins DB function ──────────────────────────────────
-- Atomically increments coin balance and logs the transaction.
-- Called from the JS service layer via supabase.rpc('award_coins', ...).
CREATE OR REPLACE FUNCTION award_coins(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_type        VARCHAR,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE food_passports
    SET coins = coins + p_amount
  WHERE user_id = p_user_id
  RETURNING coins INTO new_balance;

  INSERT INTO coin_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);

  RETURN COALESCE(new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

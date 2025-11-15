-- Migration: Create risk_limits and risk_usage_daily tables
-- This migration creates the risk policy backbone for enforcing hard limits in DB-driven config

-- Step 1: Create risk_limits table
CREATE TABLE IF NOT EXISTS risk_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users(id) via view (FK constraint not supported on views)
  strategy_id UUID NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  exchange_connection_id UUID NULL REFERENCES exchange_connections(id) ON DELETE CASCADE,

  -- Risk limit fields (all nullable for flexibility)
  max_notional_per_order NUMERIC(20, 8) NULL,
  max_daily_notional NUMERIC(20, 8) NULL,
  max_open_notional NUMERIC(20, 8) NULL,
  max_open_orders INT NULL,
  allowed_symbols TEXT[] NULL,  -- whitelist
  blocked_symbols TEXT[] NULL,  -- blacklist

  -- Execution mode: controls how orders are executed
  execution_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (execution_mode IN ('manual', 'auto_sandbox', 'auto_prod', 'disabled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note on risk_limits scoping:
-- Global user limits have only user_id set (strategy_id and exchange_connection_id are NULL)
-- Strategy-specific limits have user_id + strategy_id
-- Exchange-specific limits have user_id + exchange_connection_id
-- Strategy+exchange limits have all three set

-- Step 2: Create risk_usage_daily table for tracking daily notional usage
CREATE TABLE IF NOT EXISTS risk_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users(id) via view (FK constraint not supported on views)
  date DATE NOT NULL,
  exchange_connection_id UUID NOT NULL REFERENCES exchange_connections(id) ON DELETE CASCADE,
  total_notional_traded NUMERIC(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date, exchange_connection_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_limits_user_strategy_conn
  ON risk_limits (user_id, strategy_id, exchange_connection_id);

CREATE INDEX IF NOT EXISTS idx_risk_limits_user_id
  ON risk_limits (user_id);

CREATE INDEX IF NOT EXISTS idx_risk_limits_exchange_connection_id
  ON risk_limits (exchange_connection_id);

CREATE INDEX IF NOT EXISTS idx_risk_usage_daily_user_date
  ON risk_usage_daily (user_id, date);

CREATE INDEX IF NOT EXISTS idx_risk_usage_daily_exchange_connection_date
  ON risk_usage_daily (exchange_connection_id, date);

-- Step 4: Enable Row Level Security
ALTER TABLE risk_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_usage_daily ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for risk_limits
-- Users can only see/update their own risk limits
CREATE POLICY "Users can view own risk limits"
  ON risk_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk limits"
  ON risk_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk limits"
  ON risk_limits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own risk limits"
  ON risk_limits FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Create RLS policies for risk_usage_daily
CREATE POLICY "Users can view own risk usage"
  ON risk_usage_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk usage"
  ON risk_usage_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk usage"
  ON risk_usage_daily FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 7: Add updated_at triggers
CREATE TRIGGER update_risk_limits_updated_at
  BEFORE UPDATE ON risk_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_usage_daily_updated_at
  BEFORE UPDATE ON risk_usage_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create helper function for risk limit resolution
-- This function finds the most-specific matching risk limit:
-- Priority: strategy+connection > connection > user global
CREATE OR REPLACE FUNCTION get_risk_limits(
  p_user_id UUID,
  p_strategy_id UUID DEFAULT NULL,
  p_exchange_connection_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  strategy_id UUID,
  exchange_connection_id UUID,
  max_notional_per_order NUMERIC(20, 8),
  max_daily_notional NUMERIC(20, 8),
  max_open_notional NUMERIC(20, 8),
  max_open_orders INT,
  allowed_symbols TEXT[],
  blocked_symbols TEXT[],
  execution_mode TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.id,
    rl.user_id,
    rl.strategy_id,
    rl.exchange_connection_id,
    rl.max_notional_per_order,
    rl.max_daily_notional,
    rl.max_open_notional,
    rl.max_open_orders,
    rl.allowed_symbols,
    rl.blocked_symbols,
    rl.execution_mode
  FROM risk_limits rl
  WHERE rl.user_id = p_user_id
    AND (
      -- Most specific: strategy + exchange connection
      (p_strategy_id IS NOT NULL AND p_exchange_connection_id IS NOT NULL
       AND rl.strategy_id = p_strategy_id AND rl.exchange_connection_id = p_exchange_connection_id)
      OR
      -- Medium: exchange connection only
      (p_exchange_connection_id IS NOT NULL AND rl.exchange_connection_id = p_exchange_connection_id
       AND rl.strategy_id IS NULL)
      OR
      -- Least specific: user global (no strategy, no connection)
      (rl.strategy_id IS NULL AND rl.exchange_connection_id IS NULL)
    )
  ORDER BY
    -- Order by specificity: strategy+connection first, then connection, then global
    CASE
      WHEN rl.strategy_id IS NOT NULL AND rl.exchange_connection_id IS NOT NULL THEN 1
      WHEN rl.exchange_connection_id IS NOT NULL THEN 2
      ELSE 3
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_risk_limits(UUID, UUID, UUID) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Risk limits tables created successfully.';
  RAISE NOTICE 'Tables: risk_limits, risk_usage_daily';
  RAISE NOTICE 'Function: get_risk_limits(user_id, strategy_id, exchange_connection_id)';
  RAISE NOTICE 'RLS policies enabled for both tables.';
END $$;

-- Rollback instructions (commented out):
-- DROP FUNCTION IF EXISTS get_risk_limits(UUID, UUID, UUID);
-- DROP TABLE IF EXISTS risk_usage_daily CASCADE;
-- DROP TABLE IF EXISTS risk_limits CASCADE;


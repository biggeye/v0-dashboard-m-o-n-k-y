-- Migration: Create trading_order_executions table
-- This migration separates internal orders from external executions, enabling multiple fills per order

-- Step 1: Create trading_order_executions table
CREATE TABLE IF NOT EXISTS trading_order_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trading_order_id UUID NOT NULL REFERENCES trading_orders(id) ON DELETE CASCADE,
  exchange_connection_id UUID NOT NULL REFERENCES exchange_connections(id) ON DELETE CASCADE,
  
  -- Denormalized from exchange_connection for query performance
  provider TEXT NOT NULL,
  api_family TEXT NOT NULL,
  env TEXT NOT NULL,

  -- Execution details from exchange
  exchange_order_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  executed_quantity NUMERIC(20, 8) NOT NULL,
  executed_price NUMERIC(20, 8) NOT NULL,
  fee NUMERIC(20, 8) DEFAULT 0,
  liquidity TEXT NULL, -- maker/taker, if available from exchange
  status TEXT NOT NULL DEFAULT 'filled'
    CHECK (status IN ('open', 'partially_filled', 'filled', 'cancelled', 'rejected')),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
-- Index for finding all executions for a given internal order
CREATE INDEX IF NOT EXISTS idx_trading_order_executions_order_id
  ON trading_order_executions (trading_order_id);

-- Index for finding executions by exchange connection and time
CREATE INDEX IF NOT EXISTS idx_trading_order_executions_connection_executed
  ON trading_order_executions (exchange_connection_id, executed_at DESC);

-- Index for finding executions by exchange order ID (for webhook updates)
CREATE INDEX IF NOT EXISTS idx_trading_order_executions_exchange_order_id
  ON trading_order_executions (exchange_order_id);

-- Index for provider/env queries
CREATE INDEX IF NOT EXISTS idx_trading_order_executions_provider_env
  ON trading_order_executions (provider, env);

-- Step 3: Enable Row Level Security
ALTER TABLE trading_order_executions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Users can only see executions for their own orders (via trading_orders join)
CREATE POLICY "Users can view own order executions"
  ON trading_order_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trading_orders
      WHERE trading_orders.id = trading_order_executions.trading_order_id
        AND trading_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own order executions"
  ON trading_order_executions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_orders
      WHERE trading_orders.id = trading_order_executions.trading_order_id
        AND trading_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own order executions"
  ON trading_order_executions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trading_orders
      WHERE trading_orders.id = trading_order_executions.trading_order_id
        AND trading_orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_orders
      WHERE trading_orders.id = trading_order_executions.trading_order_id
        AND trading_orders.user_id = auth.uid()
    )
  );

-- Step 5: Add updated_at trigger
CREATE TRIGGER update_trading_order_executions_updated_at
  BEFORE UPDATE ON trading_order_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Create function to sync denormalized fields from exchange_connection
-- This ensures provider, api_family, env stay in sync with exchange_connection
CREATE OR REPLACE FUNCTION sync_execution_exchange_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Populate denormalized fields from exchange_connection
  SELECT ec.provider, ec.api_family, ec.env
  INTO NEW.provider, NEW.api_family, NEW.env
  FROM exchange_connections ec
  WHERE ec.id = NEW.exchange_connection_id;

  IF NEW.provider IS NULL THEN
    RAISE EXCEPTION 'exchange_connection_id % does not exist', NEW.exchange_connection_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate denormalized fields on insert/update
CREATE TRIGGER sync_execution_exchange_fields_trigger
  BEFORE INSERT OR UPDATE OF exchange_connection_id ON trading_order_executions
  FOR EACH ROW
  EXECUTE FUNCTION sync_execution_exchange_fields();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Trading order executions table created successfully.';
  RAISE NOTICE 'Table: trading_order_executions';
  RAISE NOTICE 'Indexes created for performance.';
  RAISE NOTICE 'RLS policies enabled.';
  RAISE NOTICE 'Note: trading_orders.exchange_order_id is kept for backward compatibility during transition.';
END $$;

-- Rollback instructions (commented out):
-- DROP TRIGGER IF EXISTS sync_execution_exchange_fields_trigger ON trading_order_executions;
-- DROP FUNCTION IF EXISTS sync_execution_exchange_fields();
-- DROP TRIGGER IF EXISTS update_trading_order_executions_updated_at ON trading_order_executions;
-- DROP TABLE IF EXISTS trading_order_executions CASCADE;


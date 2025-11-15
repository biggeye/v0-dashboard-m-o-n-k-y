-- Migration: Add provider, api_family, and env columns to exchange_connections
-- This migration adds the new columns, backfills data, and enforces constraints

-- Step 1: Add nullable columns first
ALTER TABLE exchange_connections
  ADD COLUMN provider text,
  ADD COLUMN api_family text,
  ADD COLUMN env text;

-- Step 2: Backfill existing data
-- Backfill provider from exchange_name pattern matching
UPDATE exchange_connections
SET provider = CASE
  WHEN exchange_name LIKE 'coinbase%' THEN 'coinbase'
  WHEN exchange_name = 'binance_us' THEN 'binance'
  WHEN exchange_name = 'kraken' THEN 'kraken'
  ELSE 'unknown'
END;

-- Backfill api_family from exchange_name for Coinbase variants
UPDATE exchange_connections
SET api_family = CASE
  WHEN exchange_name = 'coinbase_advanced_trade' THEN 'advanced_trade'
  WHEN exchange_name = 'coinbase_exchange' THEN 'exchange'
  WHEN exchange_name = 'coinbase_app' THEN 'app'
  WHEN exchange_name = 'coinbase_server_wallet' THEN 'server_wallet'
  WHEN exchange_name = 'coinbase_trade_api' THEN 'trade_api'
  WHEN exchange_name IN ('coinbase', 'coinbase_pro') THEN 'advanced_trade'
  ELSE NULL
END;

-- Backfill env from is_testnet boolean
UPDATE exchange_connections
SET env = CASE
  WHEN is_testnet THEN 'sandbox'
  ELSE 'prod'
END;

-- Step 3: Extract coinbaseApiFamily from metadata if present (overrides inference)
UPDATE exchange_connections
SET api_family = metadata->>'coinbaseApiFamily'
WHERE provider = 'coinbase'
  AND metadata ? 'coinbaseApiFamily'
  AND metadata->>'coinbaseApiFamily' IS NOT NULL;

-- Step 4: After data inspection, set columns to NOT NULL with defaults
ALTER TABLE exchange_connections
  ALTER COLUMN provider SET NOT NULL,
  ALTER COLUMN api_family SET NOT NULL,
  ALTER COLUMN env SET NOT NULL;

-- Add defaults for future inserts
ALTER TABLE exchange_connections
  ALTER COLUMN provider SET DEFAULT 'coinbase',
  ALTER COLUMN api_family SET DEFAULT 'advanced_trade',
  ALTER COLUMN env SET DEFAULT 'prod';

-- Step 5: Add CHECK constraints
ALTER TABLE exchange_connections
  ADD CONSTRAINT exchange_connections_env_check
  CHECK (env IN ('prod', 'sandbox'));

-- Add CHECK constraint for Coinbase api_family values
ALTER TABLE exchange_connections
  ADD CONSTRAINT exchange_connections_coinbase_family_check
  CHECK (
    provider <> 'coinbase'
    OR api_family IN ('app', 'advanced_trade', 'exchange', 'server_wallet', 'trade_api')
  );

-- Step 6: Add new UNIQUE constraint (keep old one temporarily)
ALTER TABLE exchange_connections
  ADD CONSTRAINT exchange_connections_user_provider_family_env_key
  UNIQUE (user_id, provider, api_family, env);

-- Note: We keep the old UNIQUE constraint (user_id, exchange_name) for now
-- It will be dropped in a future migration after all code is updated


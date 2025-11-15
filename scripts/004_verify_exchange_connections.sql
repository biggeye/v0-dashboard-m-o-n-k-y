-- Migration: Verify exchange_connections columns, constraints, and add missing index
-- This migration verifies that migration 003 was applied correctly and adds the missing index

-- Step 1: Verify columns exist and are NOT NULL
-- This will fail if columns don't exist (migration 003 not run)
DO $$
BEGIN
  -- Check if columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exchange_connections' 
    AND column_name = 'provider'
  ) THEN
    RAISE EXCEPTION 'Column provider does not exist. Please run migration 003 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exchange_connections' 
    AND column_name = 'api_family'
  ) THEN
    RAISE EXCEPTION 'Column api_family does not exist. Please run migration 003 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exchange_connections' 
    AND column_name = 'env'
  ) THEN
    RAISE EXCEPTION 'Column env does not exist. Please run migration 003 first.';
  END IF;

  -- Check if columns are NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exchange_connections' 
    AND column_name = 'provider' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Column provider is nullable. Please run migration 003 to completion.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exchange_connections' 
    AND column_name = 'api_family' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Column api_family is nullable. Please run migration 003 to completion.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exchange_connections' 
    AND column_name = 'env' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Column env is nullable. Please run migration 003 to completion.';
  END IF;
END $$;

-- Step 2: Data quality check - Coinbase rows must have valid api_family
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM exchange_connections
  WHERE provider = 'coinbase'
    AND api_family NOT IN ('app', 'advanced_trade', 'exchange', 'server_wallet', 'trade_api');

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % Coinbase connections with invalid api_family values. Please review and fix.', invalid_count;
  END IF;
END $$;

-- Step 3: Verify env CHECK constraint exists and only allows 'prod' and 'sandbox'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'exchange_connections'
      AND tc.constraint_name = 'exchange_connections_env_check'
      AND cc.check_clause LIKE '%prod%'
      AND cc.check_clause LIKE '%sandbox%'
  ) THEN
    RAISE EXCEPTION 'env CHECK constraint missing or incorrect. Expected: env IN (''prod'', ''sandbox'')';
  END IF;
END $$;

-- Step 4: Verify Coinbase family CHECK exists and excludes provider <> 'coinbase'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'exchange_connections'
      AND tc.constraint_name = 'exchange_connections_coinbase_family_check'
      AND cc.check_clause LIKE '%provider%'
      AND cc.check_clause LIKE '%coinbase%'
  ) THEN
    RAISE EXCEPTION 'Coinbase family CHECK constraint missing or incorrect.';
  END IF;
END $$;

-- Step 5: Verify UNIQUE constraint (user_id, provider, api_family, env) exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'exchange_connections'
      AND constraint_name = 'exchange_connections_user_provider_family_env_key'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE EXCEPTION 'UNIQUE constraint (user_id, provider, api_family, env) missing.';
  END IF;
END $$;

-- Step 6: Add missing index for query performance
CREATE INDEX IF NOT EXISTS idx_exchange_connections_user_provider_env
  ON exchange_connections (user_id, provider, env);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Exchange connections verification complete. All checks passed.';
  RAISE NOTICE 'Index idx_exchange_connections_user_provider_env created/verified.';
END $$;


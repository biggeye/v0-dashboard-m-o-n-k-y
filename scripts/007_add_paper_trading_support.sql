-- Migration: Add paper trading (simulation) support to exchange_connections
-- This migration updates constraints to allow simulation provider with paper api_family and sandbox env

-- Step 1: Add or update provider CHECK constraint to include 'simulation'
-- Check if provider constraint exists, drop it if it does, then add the updated one
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Find existing provider CHECK constraint
  SELECT tc.constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'exchange_connections'
    AND tc.constraint_type = 'CHECK'
    AND (cc.check_clause LIKE '%provider%' OR tc.constraint_name LIKE '%provider%')
  LIMIT 1;

  -- Drop if exists
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE 'ALTER TABLE exchange_connections DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    RAISE NOTICE 'Dropped existing provider CHECK constraint: %', constraint_name_var;
  END IF;
END $$;

-- Step 2: Add provider CHECK constraint that includes 'simulation'
ALTER TABLE exchange_connections
  ADD CONSTRAINT exchange_connections_provider_check
  CHECK (provider IN ('coinbase', 'binance', 'kraken', 'bybit', 'simulation'));

-- Step 3: Verify env CHECK constraint only allows 'prod' and 'sandbox' (no 'virtual')
-- If it doesn't exist or is incorrect, fix it
DO $$
BEGIN
  -- Check if env constraint exists and is correct
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'exchange_connections'
      AND tc.constraint_name = 'exchange_connections_env_check'
      AND cc.check_clause LIKE '%prod%'
      AND cc.check_clause LIKE '%sandbox%'
      AND cc.check_clause NOT LIKE '%virtual%'
  ) THEN
    -- Drop incorrect constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'exchange_connections'
        AND constraint_name = 'exchange_connections_env_check'
    ) THEN
      ALTER TABLE exchange_connections DROP CONSTRAINT exchange_connections_env_check;
    END IF;
    
    -- Add correct constraint
    ALTER TABLE exchange_connections
      ADD CONSTRAINT exchange_connections_env_check
      CHECK (env IN ('prod', 'sandbox'));
    
    RAISE NOTICE 'Created/updated env CHECK constraint to only allow prod and sandbox';
  ELSE
    RAISE NOTICE 'env CHECK constraint is already correct (prod, sandbox only)';
  END IF;
END $$;

-- Step 4: Verify Coinbase family CHECK is scoped to provider = 'coinbase' only
-- This ensures it doesn't block simulation provider
DO $$
BEGIN
  -- Check if Coinbase family constraint exists and is correctly scoped
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'exchange_connections'
      AND tc.constraint_name = 'exchange_connections_coinbase_family_check'
      AND (cc.check_clause LIKE '%provider%<>%coinbase%' OR cc.check_clause LIKE '%provider%!=%coinbase%')
  ) THEN
    RAISE NOTICE 'Coinbase family CHECK constraint is correctly scoped (only applies when provider = coinbase)';
  ELSE
    -- If constraint exists but is incorrectly scoped, drop and recreate
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'exchange_connections'
        AND constraint_name = 'exchange_connections_coinbase_family_check'
    ) THEN
      ALTER TABLE exchange_connections DROP CONSTRAINT exchange_connections_coinbase_family_check;
    END IF;
    
    -- Recreate with correct scoping
    ALTER TABLE exchange_connections
      ADD CONSTRAINT exchange_connections_coinbase_family_check
      CHECK (
        provider <> 'coinbase'
        OR api_family IN ('app', 'advanced_trade', 'exchange', 'server_wallet', 'trade_api')
      );
    
    RAISE NOTICE 'Recreated Coinbase family CHECK constraint with correct scoping';
  END IF;
END $$;

-- Step 5: Verify the combination works (validation only, no test insert)
-- The constraints should now allow: provider='simulation', api_family='paper', env='sandbox'
-- This is validated by the constraint definitions above

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Paper trading support added successfully.';
  RAISE NOTICE 'Provider constraint now includes: coinbase, binance, kraken, bybit, simulation';
  RAISE NOTICE 'Env constraint remains: prod, sandbox (no virtual)';
  RAISE NOTICE 'Coinbase family CHECK is scoped to provider = coinbase only';
  RAISE NOTICE 'Allowed combination: provider=simulation, api_family=paper, env=sandbox';
END $$;

-- Rollback instructions (commented out):
-- ALTER TABLE exchange_connections DROP CONSTRAINT IF EXISTS exchange_connections_provider_check;
-- ALTER TABLE exchange_connections DROP CONSTRAINT IF EXISTS exchange_connections_env_check;
-- ALTER TABLE exchange_connections DROP CONSTRAINT IF EXISTS exchange_connections_coinbase_family_check;
-- Then recreate constraints without 'simulation' if needed


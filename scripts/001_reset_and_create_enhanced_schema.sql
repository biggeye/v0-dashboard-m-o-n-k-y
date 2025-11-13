-- Reset Supabase Database & Create Enhanced Schema for Crypto Trading Platform
-- This script creates a comprehensive database structure for:
-- 1. Real-time price data storage
-- 2. Exchange API integrations (Kraken, Binance US, Coinbase)
-- 3. DeFi wallet connections
-- 4. Trading order management
-- 5. Portfolio tracking
-- 6. Strategy management

-- Drop existing tables if they exist (reset)
DROP TABLE IF EXISTS price_alerts CASCADE;
DROP TABLE IF EXISTS portfolio_holdings CASCADE;
DROP TABLE IF EXISTS trading_strategies CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS exchange_connections CASCADE;
DROP TABLE IF EXISTS wallet_connections CASCADE;
DROP TABLE IF EXISTS trading_orders CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS dashboard_stats CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table (linked to auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferred_symbols TEXT[] DEFAULT ARRAY['BTC', 'ETH']::TEXT[],
  timezone TEXT DEFAULT 'UTC',
  location TEXT,
  api_key_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange Connections Table (Kraken, Binance US, Coinbase, etc.)
CREATE TABLE exchange_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_name TEXT NOT NULL CHECK (exchange_name IN ('kraken', 'binance_us', 'coinbase', 'coinbase_pro')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  api_passphrase_encrypted TEXT, -- For Coinbase Pro
  is_active BOOLEAN DEFAULT true,
  is_testnet BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{"read": true, "trade": false, "withdraw": false}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exchange_name)
);

-- DeFi Wallet Connections Table (MetaMask, WalletConnect, etc.)
CREATE TABLE wallet_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('metamask', 'walletconnect', 'coinbase_wallet', 'phantom', 'trust_wallet')),
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL, -- 1 = Ethereum, 56 = BSC, 137 = Polygon, etc.
  chain_name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  balance_usd NUMERIC(20, 8) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address, chain_id)
);

-- Price History Table (Public data, no user_id)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  market_cap NUMERIC(30, 2),
  volume_24h NUMERIC(30, 2),
  change_24h NUMERIC(10, 4),
  high_24h NUMERIC(20, 8),
  low_24h NUMERIC(20, 8),
  source TEXT DEFAULT 'finnhub', -- finnhub, kraken, binance, coinbase, coingecko
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading Orders Table
CREATE TABLE trading_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_connection_id UUID REFERENCES exchange_connections(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop_loss', 'stop_limit', 'trailing_stop')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  symbol TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8), -- NULL for market orders
  stop_price NUMERIC(20, 8), -- For stop orders
  filled_quantity NUMERIC(20, 8) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired')),
  exchange_order_id TEXT, -- ID from the exchange
  total_cost NUMERIC(20, 8),
  fees NUMERIC(20, 8) DEFAULT 0,
  average_fill_price NUMERIC(20, 8),
  executed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions Table (Completed trades and wallet transactions)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'deposit', 'withdrawal', 'transfer', 'fee', 'swap')),
  symbol TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8),
  total_value NUMERIC(20, 8) NOT NULL,
  fees NUMERIC(20, 8) DEFAULT 0,
  source TEXT NOT NULL, -- exchange name or wallet address
  source_type TEXT NOT NULL CHECK (source_type IN ('exchange', 'wallet')),
  exchange_connection_id UUID REFERENCES exchange_connections(id) ON DELETE SET NULL,
  wallet_connection_id UUID REFERENCES wallet_connections(id) ON DELETE SET NULL,
  order_id UUID REFERENCES trading_orders(id) ON DELETE SET NULL,
  transaction_hash TEXT, -- For blockchain transactions
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Holdings Table
CREATE TABLE portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL DEFAULT 0,
  average_buy_price NUMERIC(20, 8) NOT NULL,
  total_invested NUMERIC(20, 8) NOT NULL DEFAULT 0,
  current_value NUMERIC(20, 8) DEFAULT 0,
  unrealized_pnl NUMERIC(20, 8) DEFAULT 0,
  realized_pnl NUMERIC(20, 8) DEFAULT 0,
  source TEXT NOT NULL, -- Which exchange or wallet
  source_type TEXT NOT NULL CHECK (source_type IN ('exchange', 'wallet')),
  exchange_connection_id UUID REFERENCES exchange_connections(id) ON DELETE CASCADE,
  wallet_connection_id UUID REFERENCES wallet_connections(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol, source, source_type)
);

-- Trading Strategies Table
CREATE TABLE trading_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  symbol TEXT NOT NULL,
  indicators TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  entry_conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  exit_conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  risk_parameters JSONB DEFAULT '{"max_position_size": 1000, "stop_loss_pct": 5, "take_profit_pct": 10}'::JSONB,
  is_active BOOLEAN DEFAULT false,
  is_automated BOOLEAN DEFAULT false,
  exchange_connection_id UUID REFERENCES exchange_connections(id) ON DELETE SET NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl NUMERIC(20, 8) DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Alerts Table
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'crosses_above', 'crosses_below')),
  price_threshold NUMERIC(20, 8) NOT NULL,
  is_triggered BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  notification_channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[], -- in_app, email, sms, webhook
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Stats Table (Replaces mock.json data)
CREATE TABLE dashboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_type TEXT NOT NULL CHECK (stat_type IN ('total_portfolio_value', 'total_pnl', 'win_rate', 'active_positions', 'total_trades', 'daily_pnl', 'weekly_pnl', 'monthly_pnl')),
  value NUMERIC(20, 8) NOT NULL,
  previous_value NUMERIC(20, 8),
  change_percentage NUMERIC(10, 4),
  period TEXT DEFAULT 'current' CHECK (period IN ('current', 'daily', 'weekly', 'monthly', 'yearly')),
  metadata JSONB DEFAULT '{}'::JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stat_type, period)
);

-- Create indexes for performance
CREATE INDEX idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC);
CREATE INDEX idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX idx_trading_orders_user_status ON trading_orders(user_id, status);
CREATE INDEX idx_trading_orders_symbol ON trading_orders(symbol);
CREATE INDEX idx_transactions_user_timestamp ON transactions(user_id, timestamp DESC);
CREATE INDEX idx_portfolio_holdings_user ON portfolio_holdings(user_id);
CREATE INDEX idx_exchange_connections_user_active ON exchange_connections(user_id, is_active);
CREATE INDEX idx_wallet_connections_user ON wallet_connections(user_id);
CREATE INDEX idx_trading_strategies_user_active ON trading_strategies(user_id, is_active);
CREATE INDEX idx_price_alerts_user_active ON price_alerts(user_id, is_active, is_triggered);
CREATE INDEX idx_dashboard_stats_user_type ON dashboard_stats(user_id, stat_type, period);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for exchange_connections
CREATE POLICY "Users can view own exchange connections" ON exchange_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exchange connections" ON exchange_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exchange connections" ON exchange_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exchange connections" ON exchange_connections FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for wallet_connections
CREATE POLICY "Users can view own wallet connections" ON wallet_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet connections" ON wallet_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet connections" ON wallet_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wallet connections" ON wallet_connections FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for price_history (Public read, authenticated write)
CREATE POLICY "Anyone can view price history" ON price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert price history" ON price_history FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for trading_orders
CREATE POLICY "Users can view own orders" ON trading_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON trading_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON trading_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own orders" ON trading_orders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for portfolio_holdings
CREATE POLICY "Users can view own holdings" ON portfolio_holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON portfolio_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON portfolio_holdings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holdings" ON portfolio_holdings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trading_strategies
CREATE POLICY "Users can view own strategies" ON trading_strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategies" ON trading_strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategies" ON trading_strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategies" ON trading_strategies FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for price_alerts
CREATE POLICY "Users can view own alerts" ON price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON price_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON price_alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for dashboard_stats
CREATE POLICY "Users can view own stats" ON dashboard_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON dashboard_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON dashboard_stats FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_connections_updated_at BEFORE UPDATE ON exchange_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_connections_updated_at BEFORE UPDATE ON wallet_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_orders_updated_at BEFORE UPDATE ON trading_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_holdings_updated_at BEFORE UPDATE ON portfolio_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Enhanced database schema created successfully!';
  RAISE NOTICE 'Tables created: user_profiles, exchange_connections, wallet_connections, price_history, trading_orders, transactions, portfolio_holdings, trading_strategies, price_alerts, dashboard_stats';
  RAISE NOTICE 'RLS policies enabled for all tables';
  RAISE NOTICE 'Ready for exchange integrations (Kraken, Binance US, Coinbase) and DeFi wallet connections';
END $$;

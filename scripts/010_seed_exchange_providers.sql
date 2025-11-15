-- Migration: Seed exchange provider data
-- This migration seeds the exchange_providers table with current hardcoded configurations

-- Note: This is a simplified seed. In production, you may want to use a more comprehensive
-- approach that reads from the actual TypeScript configs or uses a data migration tool.

-- Coinbase Advanced Trade (Production)
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'coinbase',
  'advanced_trade',
  'jwt_service',
  '["jwtKeyName", "jwtPrivateKey"]'::JSONB,
  '{"read": true, "trade_spot": true, "trade_derivatives": true, "withdraw": false, "onchain": false}'::JSONB,
  ARRAY['prod', 'sandbox'],
  1
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Coinbase Exchange (Production)
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'coinbase',
  'exchange',
  'api_key',
  '["apiKey", "apiSecret", "apiPassphrase"]'::JSONB,
  '{"read": true, "trade_spot": true, "trade_derivatives": true, "withdraw": false, "onchain": false}'::JSONB,
  ARRAY['prod', 'sandbox'],
  2
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Coinbase App
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'coinbase',
  'app',
  'oauth',
  '[]'::JSONB,
  '{"read": true, "trade_spot": false, "trade_derivatives": false, "withdraw": true, "onchain": false}'::JSONB,
  ARRAY['prod'],
  3
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Coinbase Server Wallet
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'coinbase',
  'server_wallet',
  'jwt_service',
  '["jwtKeyName", "jwtPrivateKey"]'::JSONB,
  '{"read": true, "trade_spot": false, "trade_derivatives": false, "withdraw": false, "onchain": true}'::JSONB,
  ARRAY['prod'],
  4
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Coinbase Trade API
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'coinbase',
  'trade_api',
  'jwt_service',
  '["jwtKeyName", "jwtPrivateKey"]'::JSONB,
  '{"read": false, "trade_spot": false, "trade_derivatives": false, "withdraw": false, "onchain": true}'::JSONB,
  ARRAY['prod'],
  5
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Binance US
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'binance',
  'us',
  'api_key',
  '["apiKey", "apiSecret"]'::JSONB,
  '{"read": true, "trade_spot": true, "trade_derivatives": false, "withdraw": true, "onchain": false}'::JSONB,
  ARRAY['prod', 'sandbox'],
  10
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Kraken
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'kraken',
  'standard',
  'api_key',
  '["apiKey", "apiSecret"]'::JSONB,
  '{"read": true, "trade_spot": true, "trade_derivatives": true, "withdraw": true, "onchain": false}'::JSONB,
  ARRAY['prod', 'sandbox'],
  20
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Bybit
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'bybit',
  'standard',
  'api_key',
  '["apiKey", "apiSecret"]'::JSONB,
  '{"read": true, "trade_spot": true, "trade_derivatives": true, "withdraw": true, "onchain": false}'::JSONB,
  ARRAY['prod', 'sandbox'],
  30
) ON CONFLICT (provider_name, api_family) DO NOTHING;

-- Simulation / Paper Trading
INSERT INTO public.exchange_providers (provider_name, api_family, auth_type, required_fields, capabilities, supported_envs, display_order)
VALUES (
  'simulation',
  'paper',
  'none',
  '[]'::JSONB,
  '{"read": true, "trade_spot": true, "trade_derivatives": true, "withdraw": false, "onchain": false}'::JSONB,
  ARRAY['sandbox'],
  100
) ON CONFLICT (provider_name, api_family) DO NOTHING;


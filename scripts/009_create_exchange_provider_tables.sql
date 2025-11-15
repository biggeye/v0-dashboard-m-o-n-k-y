-- Migration: Create exchange provider master tables
-- This migration creates tables to store exchange provider metadata
-- replacing hardcoded configurations with database-backed data

-- Exchange Providers Table
CREATE TABLE IF NOT EXISTS public.exchange_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name TEXT NOT NULL,
  api_family TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('api_key', 'oauth', 'jwt_service', 'none')),
  required_fields JSONB DEFAULT '[]'::JSONB,
  capabilities JSONB DEFAULT '{}'::JSONB,
  supported_envs TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_name, api_family)
);

-- Exchange Provider Environments Table
CREATE TABLE IF NOT EXISTS public.exchange_provider_environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.exchange_providers(id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('prod', 'sandbox')),
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, environment)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_providers_active ON public.exchange_providers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchange_providers_display_order ON public.exchange_providers(display_order);
CREATE INDEX IF NOT EXISTS idx_exchange_provider_environments_provider ON public.exchange_provider_environments(provider_id);


-- Migration: Add user_assets table and token_index discovery fields
-- This migration adds support for user asset selection and ERC20 token discovery

-- Add new columns to token_index for discovery support
ALTER TABLE public.token_index
ADD COLUMN IF NOT EXISTS discovery_status TEXT CHECK (discovery_status IN ('manual', 'discovered_pending', 'discovered_approved', 'active')) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS chain_id INTEGER,
ADD COLUMN IF NOT EXISTS decimals INTEGER;

-- Create index for discovery_status for faster queries
CREATE INDEX IF NOT EXISTS idx_token_index_discovery_status ON public.token_index(discovery_status);
CREATE INDEX IF NOT EXISTS idx_token_index_contract_chain ON public.token_index(contract_address, chain_id) WHERE contract_address IS NOT NULL;

-- Create user_assets table for tracking user-selected tokens
CREATE TABLE IF NOT EXISTS public.user_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.token_index(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  added_via TEXT CHECK (added_via IN ('manual', 'wallet_discovery', 'admin')) DEFAULT 'manual',
  wallet_connection_id UUID REFERENCES public.wallet_connections(id) ON DELETE SET NULL,
  discovered_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token_id)
);

-- Create indexes for user_assets
CREATE INDEX IF NOT EXISTS idx_user_assets_user_id ON public.user_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assets_token_id ON public.user_assets(token_id);
CREATE INDEX IF NOT EXISTS idx_user_assets_active ON public.user_assets(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_assets_wallet_connection ON public.user_assets(wallet_connection_id) WHERE wallet_connection_id IS NOT NULL;

-- Enable RLS on user_assets
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_assets
CREATE POLICY "user_assets_select_own"
  ON public.user_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_assets_insert_own"
  ON public.user_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_assets_update_own"
  ON public.user_assets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_assets_delete_own"
  ON public.user_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to see all user_assets
CREATE POLICY "user_assets_select_admin"
  ON public.user_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Update existing tokens to have 'manual' discovery_status if null
UPDATE public.token_index
SET discovery_status = 'manual'
WHERE discovery_status IS NULL;


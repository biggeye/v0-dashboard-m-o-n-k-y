-- Migration: Add description column to token_index table
-- This migration adds a description field to store token/project descriptions
-- which can be fetched from external sources like Finnhub profile API

ALTER TABLE public.token_index
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for full-text search on descriptions (optional, for future use)
-- CREATE INDEX IF NOT EXISTS idx_token_index_description_fts ON public.token_index USING gin(to_tsvector('english', description));


-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Price history table for storing cryptocurrency price data
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  price numeric not null,
  market_cap numeric,
  volume_24h numeric,
  change_24h numeric,
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(symbol, timestamp)
);

-- Create index for faster queries
create index idx_price_history_symbol_timestamp on public.price_history(symbol, timestamp desc);
create index idx_price_history_timestamp on public.price_history(timestamp desc);

-- Alter table to enable RLS (no user_id needed for price history as it's public data)
alter table public.price_history enable row level security;

-- Allow all authenticated users to read price history
create policy "price_history_select_authenticated"
  on public.price_history for select
  using (true);

-- Allow service role to insert price data
create policy "price_history_insert_service"
  on public.price_history for insert
  with check (true);

-- User trading strategies table
create table if not exists public.trading_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  symbol text not null,
  entry_condition jsonb,
  exit_condition jsonb,
  indicators jsonb,
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.trading_strategies enable row level security;

create policy "strategies_select_own"
  on public.trading_strategies for select
  using (auth.uid() = user_id);

create policy "strategies_insert_own"
  on public.trading_strategies for insert
  with check (auth.uid() = user_id);

create policy "strategies_update_own"
  on public.trading_strategies for update
  using (auth.uid() = user_id);

create policy "strategies_delete_own"
  on public.trading_strategies for delete
  using (auth.uid() = user_id);

-- Portfolio holdings table
create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  quantity numeric not null,
  average_buy_price numeric not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, symbol)
);

alter table public.portfolio_holdings enable row level security;

create policy "holdings_select_own"
  on public.portfolio_holdings for select
  using (auth.uid() = user_id);

create policy "holdings_insert_own"
  on public.portfolio_holdings for insert
  with check (auth.uid() = user_id);

create policy "holdings_update_own"
  on public.portfolio_holdings for update
  using (auth.uid() = user_id);

create policy "holdings_delete_own"
  on public.portfolio_holdings for delete
  using (auth.uid() = user_id);

-- Alert and notifications table
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  condition text not null, -- 'above', 'below'
  price_threshold numeric not null,
  is_triggered boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.price_alerts enable row level security;

create policy "alerts_select_own"
  on public.price_alerts for select
  using (auth.uid() = user_id);

create policy "alerts_insert_own"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

create policy "alerts_update_own"
  on public.price_alerts for update
  using (auth.uid() = user_id);

create policy "alerts_delete_own"
  on public.price_alerts for delete
  using (auth.uid() = user_id);

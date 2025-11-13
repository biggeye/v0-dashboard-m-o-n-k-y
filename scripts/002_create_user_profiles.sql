-- User profiles table
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  preferred_symbols text[] default array[]::text[],
  api_key_hash text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_profiles enable row level security;

create policy "profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Trigger to create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

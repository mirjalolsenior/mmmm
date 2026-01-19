-- Web Push subscriptions table
-- Works for Android (Chrome) and iOS 16.4+ (Safari PWA when installed to Home Screen)

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep it simple (user asked for easy). You can enable RLS later if you want.
alter table public.push_subscriptions disable row level security;

create index if not exists push_subscriptions_created_at_idx on public.push_subscriptions (created_at desc);

-- Optional: auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

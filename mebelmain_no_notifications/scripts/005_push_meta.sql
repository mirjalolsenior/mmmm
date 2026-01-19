-- Simple meta table for push jobs (to avoid sending the same notification many times a day)

create table if not exists public.push_meta (
  key text primary key,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_meta disable row level security;

-- Reuse set_updated_at() from earlier scripts if it exists
do $$
begin
  if exists (
    select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace
  ) then
    drop trigger if exists push_meta_set_updated_at on public.push_meta;
    create trigger push_meta_set_updated_at
    before update on public.push_meta
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

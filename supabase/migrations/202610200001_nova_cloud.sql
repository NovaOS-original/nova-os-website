-- NOVA OS cloud schema. All exposed user tables use RLS.
create table if not exists public.nova_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  avatar_url text not null default '',
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.nova_profiles enable row level security;
revoke all on public.nova_profiles from anon;
grant select on public.nova_profiles to authenticated;
drop policy if exists "Users can read own NOVA profile" on public.nova_profiles;
create policy "Users can read own NOVA profile" on public.nova_profiles for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.nova_activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('page_view','video_generation_started','video_generation_completed','video_generation_failed','video_exported','chat_request','login','logout')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
create index if not exists nova_activity_user_created_idx on public.nova_activity_logs(user_id, created_at desc);
create index if not exists nova_activity_expiry_idx on public.nova_activity_logs(expires_at);
alter table public.nova_activity_logs enable row level security;
revoke all on public.nova_activity_logs from anon;
grant select on public.nova_activity_logs to authenticated;
drop policy if exists "Users can read own NOVA activity" on public.nova_activity_logs;
create policy "Users can read own NOVA activity" on public.nova_activity_logs for select to authenticated using ((select auth.uid()) = user_id);
-- Inserts are performed by the authenticated Edge Function only, not directly by browsers.

create table if not exists public.nova_chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_day)
);
alter table public.nova_chat_usage enable row level security;
revoke all on public.nova_chat_usage from anon, authenticated;

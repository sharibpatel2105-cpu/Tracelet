create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  role text not null check (role in ('parent', 'child')),
  display_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  receives_sos boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_user_id uuid not null references public.profiles(id) on delete cascade,
  due_at timestamptz not null,
  checked_in_at timestamptz,
  status text not null default 'running' check (status in ('running', 'checked_in', 'missed')),
  created_at timestamptz not null default now()
);

create table if not exists public.live_locations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_user_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  speed double precision,
  heading double precision,
  battery_level double precision,
  source text not null default 'foreground' check (source in ('foreground', 'background')),
  is_live boolean not null default false,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.family_geofences (
  family_id uuid primary key references public.families(id) on delete cascade,
  shape_type text not null check (shape_type in ('circle', 'polygon')),
  center_latitude double precision not null,
  center_longitude double precision not null,
  radius_meters double precision not null check (radius_meters > 0),
  points jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('sos', 'missed_checkin', 'location_paused')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);

create or replace function public.current_profile()
returns public.profiles
language sql
stable
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.checkins enable row level security;
alter table public.live_locations enable row level security;
alter table public.family_geofences enable row level security;
alter table public.alerts enable row level security;
alter table public.device_tokens enable row level security;
alter table public.families enable row level security;

create policy "profiles own record"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "family members can read family"
on public.families
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = families.id
  )
);

create policy "family members can read contacts"
on public.contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = contacts.family_id
  )
);

create policy "family members manage contacts"
on public.contacts
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = contacts.family_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = contacts.family_id
  )
);

create policy "family members read checkins"
on public.checkins
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = checkins.family_id
  )
);

create policy "children manage own checkins"
on public.checkins
for all
to authenticated
using (child_user_id = auth.uid())
with check (child_user_id = auth.uid());

create policy "family members read live locations"
on public.live_locations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = live_locations.family_id
  )
);

create policy "children write own live locations"
on public.live_locations
for insert
to authenticated
with check (child_user_id = auth.uid());

create policy "children update own live locations"
on public.live_locations
for update
to authenticated
using (child_user_id = auth.uid())
with check (child_user_id = auth.uid());

create policy "family members read geofences"
on public.family_geofences
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
  )
);

create policy "parents insert geofences"
on public.family_geofences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
);

create policy "parents update geofences"
on public.family_geofences
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
);

create policy "parents delete geofences"
on public.family_geofences
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
);

create policy "family members read alerts"
on public.alerts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = alerts.family_id
  )
);

create policy "children insert own alerts"
on public.alerts
for insert
to authenticated
with check (child_user_id = auth.uid());

create policy "parents update alerts"
on public.alerts
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = alerts.family_id
      and p.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = alerts.family_id
      and p.role = 'parent'
  )
);

create policy "users manage own device tokens"
on public.device_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter publication supabase_realtime add table public.live_locations;
alter publication supabase_realtime add table public.family_geofences;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.checkins;

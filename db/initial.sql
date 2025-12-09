-- Enable PostGIS (if not already enabled)
create extension if not exists postgis;

-- =========================
-- ENUM TYPES
-- =========================

create type parking_zone_type as enum (
  'FREE_UNLIMITED',   -- free, no time limit
  'FREE_LIMITED',     -- e.g. 1h / 2h
  'EV_FREE',          -- free EV charging
  'PAID',             -- paid lot / meter
  'PERMIT_ONLY',      -- residents/permit only
  'MIXED'             -- combination / complex rules
);

create type parking_spot_type as enum (
  'FREE_UNLIMITED',
  'FREE_LIMITED',
  'EV_FREE',
  'PAID',
  'PERMIT_ONLY'
);

create type submission_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

create type report_status as enum (
  'OPEN',
  'RESOLVED',
  'DISMISSED'
);

create type target_type as enum (
  'ZONE',
  'SPOT'
);

-- =========================
-- PARKING ZONES (POLYGONS)
-- =========================

create table public.parking_zones (
  id uuid primary key default gen_random_uuid(),

  city text not null,
  name text, -- e.g. "Downtown 2h Zone A"
  type parking_zone_type not null,

  -- Polygon in WGS84 lat/lng
  geom geometry(Polygon, 4326) not null,

  -- if FREE_LIMITED etc.
  time_limit_minutes integer, -- e.g. 120 for 2h

  -- Optional: when free applies (e.g. free after 18:00, weekends only)
  free_start_time time,       -- e.g. 18:00
  free_end_time   time,       -- e.g. 09:00
  days_applicable smallint[] default '{0,1,2,3,4,5,6}',
  -- 0–6 = Sun–Sat (adjust if you prefer another convention)

  notes text,

  -- data provenance
  source text default 'MANUAL', -- e.g. 'MANUAL', 'CITY_OPEN_DATA'
  verified boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_parking_zones_geom on public.parking_zones using gist (geom);
create index idx_parking_zones_city on public.parking_zones (city);
create index idx_parking_zones_type on public.parking_zones (type);

-- =========================
-- PARKING SPOTS (POINTS)
-- =========================

create table public.parking_spots (
  id uuid primary key default gen_random_uuid(),

  city text not null,

  -- Optional link to zone for grouping
  zone_id uuid references public.parking_zones (id) on delete set null,

  type parking_spot_type not null,

  geom geometry(Point, 4326) not null, -- exact lat/lng

  time_limit_minutes integer,
  free_start_time time,
  free_end_time   time,
  days_applicable smallint[] default '{0,1,2,3,4,5,6}',

  notes text,

  source text default 'MANUAL',
  verified boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_parking_spots_geom on public.parking_spots using gist (geom);
create index idx_parking_spots_city on public.parking_spots (city);
create index idx_parking_spots_type on public.parking_spots (type);
create index idx_parking_spots_zone_id on public.parking_spots (zone_id);

-- =========================
-- USER SUBMISSIONS (ANONYMOUS)
-- =========================
-- For future crowdsourcing; for now you can use this
-- even without auth (store optional email/IP if you want).

create table public.user_submissions (
  id uuid primary key default gen_random_uuid(),

  -- optional contact info (no auth linkage)
  submitter_email text,
  submitter_note  text,

  target_type target_type not null, -- 'ZONE' or 'SPOT'
  target_id uuid,                   -- null for brand-new suggestion

  status submission_status not null default 'PENDING',

  -- JSON with proposed data (e.g. new zone polygon or new spot)
  payload jsonb not null,

  admin_notes text,

  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index idx_user_submissions_status on public.user_submissions (status);
create index idx_user_submissions_target on public.user_submissions (target_type, target_id);

-- =========================
-- REPORTS (INCORRECT DATA, ANONYMOUS)
-- =========================

create table public.reports (
  id uuid primary key default gen_random_uuid(),

  reporter_email text,
  reporter_note  text,

  target_type target_type not null,
  target_id uuid not null,

  reason text,
  status report_status not null default 'OPEN',

  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text
);

create index idx_reports_status on public.reports (status);
create index idx_reports_target on public.reports (target_type, target_id);

-- =========================
-- updated_at trigger for zones/spots
-- =========================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp_parking_zones
before update on public.parking_zones
for each row
execute procedure set_updated_at();

create trigger set_timestamp_parking_spots
before update on public.parking_spots
for each row
execute procedure set_updated_at();
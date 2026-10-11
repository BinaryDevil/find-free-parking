
create table if not exists public.parking_meters (
  id uuid primary key default gen_random_uuid(),
  pay_station_id text, -- maps to 'pay_phone'
  meter_head text,
  time_in_effect text,
  credit_card boolean,
  geom geometry(Point, 4326) not null,
  raw_data jsonb,
  updated_at timestamptz default now()
);
create index if not exists idx_parking_meters_geom on public.parking_meters using gist (geom);

create table if not exists public.street_segments (
  id uuid primary key default gen_random_uuid(),
  block_id text, -- maps to 'hblock'
  street_use text,
  geom geometry(LineString, 4326) not null,
  raw_data jsonb,
  updated_at timestamptz default now()
);
create index if not exists idx_street_segments_geom on public.street_segments using gist (geom);

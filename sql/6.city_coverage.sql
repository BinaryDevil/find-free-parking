-- =========================
-- CITY COVERAGE & REQUESTS
-- =========================

-- Table to define which cities/areas are supported
create table public.covered_cities (
  id uuid primary key default gen_random_uuid(),
  
  city_name text not null,
  country text not null,
  
  -- The polygon defining the coverage area
  bounds geometry(Polygon, 4326) not null,
  
  -- Center point for default map view
  center geometry(Point, 4326),
  
  is_active boolean not null default true,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_covered_cities_bounds on public.covered_cities using gist (bounds);
create index idx_covered_cities_active on public.covered_cities (is_active);

-- Table to store user requests for new cities
create table public.city_requests (
  id uuid primary key default gen_random_uuid(),
  
  -- Optional: what city they think they are in, or what they typed
  city_name text, 
  country text,
  
  -- Where they actually are
  location geometry(Point, 4326),
  
  user_ip text,    -- for simple abuse prevention logic later if needed
  
  created_at timestamptz not null default now()
);

create index idx_city_requests_location on public.city_requests using gist (location);

-- Trigger for updated_at
create trigger set_timestamp_covered_cities
before update on public.covered_cities
for each row
execute procedure set_updated_at();

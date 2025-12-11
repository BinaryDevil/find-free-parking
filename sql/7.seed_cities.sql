-- Vancouver
INSERT INTO public.covered_cities (city_name, country, bounds, is_active)
VALUES (
  'Vancouver',
  'Canada',
  ST_MakeEnvelope(-123.27, 49.19, -123.02, 49.32, 4326),
  true
);

-- Coquitlam
INSERT INTO public.covered_cities (city_name, country, bounds, is_active)
VALUES (
  'Coquitlam',
  'Canada',
  ST_MakeEnvelope(-122.90, 49.20, -122.70, 49.35, 4326),
  true
);

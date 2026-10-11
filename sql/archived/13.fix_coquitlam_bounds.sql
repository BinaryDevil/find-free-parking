-- Update Coquitlam's bounds to exclude Maple Ridge
-- Maple Ridge starts around -122.68 roughly.
-- Current East bound is -122.6199 (too far east).
-- Let's pull the East bound back to -122.75 to be safe for now, or use a more specific polygon if possible.
-- For a quick fix, let's just shrink the bounding box to not overlap with Maple Ridge.
-- Real Coquitlam eastern border is roughly the Pitt River, around -122.73.

UPDATE covered_cities 
SET bounds = ST_GeomFromText('POLYGON((-122.8937644 49.2198547,-122.8937644 49.3513789,-122.7300000 49.3513789,-122.7300000 49.2198547,-122.8937644 49.2198547))', 4326)
WHERE city_name = 'Coquitlam';

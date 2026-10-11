-- Optimization Indices
-- Created to address performance issues with map queries

-- 1. GIST Index on Parking Meters Geometry (for ST_Intersects)
CREATE INDEX IF NOT EXISTS idx_parking_meters_geom 
ON parking_meters USING GIST (geom);

-- 2. GIST Index on Street Segments Geometry (for ST_Intersects)
CREATE INDEX IF NOT EXISTS idx_street_segments_geom 
ON street_segments USING GIST (geom);

-- 3. Functional GIST Index on Geography (for ST_DWithin cast usage)
CREATE INDEX IF NOT EXISTS idx_parking_meters_geog 
ON parking_meters USING GIST ((geom::geography));

CREATE INDEX IF NOT EXISTS idx_street_segments_geog 
ON street_segments USING GIST ((geom::geography));

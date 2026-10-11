CREATE TABLE IF NOT EXISTS coverage_requests (
  id SERIAL PRIMARY KEY,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255),
  country VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  user_ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics/aggregation
CREATE INDEX IF NOT EXISTS idx_coverage_requests_city_country ON coverage_requests(city, country);

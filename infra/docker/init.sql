-- Core tables (PostgreSQL + PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE fields (
    id UUID PRIMARY KEY,
    name VARCHAR,
    boundary GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP
);

CREATE TABLE satellite_passes (
    id UUID PRIMARY KEY,
    field_id UUID REFERENCES fields(id),
    pass_date DATE,
    satellite VARCHAR DEFAULT 'SENTINEL-2',
    cloud_cover FLOAT,
    ndvi_geojson TEXT
);

CREATE TABLE change_records (
    id UUID PRIMARY KEY,
    field_id UUID,
    date1 DATE,
    date2 DATE,
    delta_array JSONB,
    changed_pixel_pct FLOAT,
    status VARCHAR,
    created_at TIMESTAMP
);

CREATE TABLE classifications (
    id UUID PRIMARY KEY,
    change_id UUID REFERENCES change_records(id),
    crop_growth_pct FLOAT,
    crop_stress_pct FLOAT,
    no_change_pct FLOAT,
    raw_result JSONB
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    field_id UUID,
    severity VARCHAR,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

CREATE INDEX idx_fields_boundary ON fields USING GIST(boundary);

-- Sample data: Tumkur agricultural zone, Karnataka
-- Bounding box: lon 76.9-77.1, lat 13.3-13.5
INSERT INTO fields (id, name, boundary, created_at)
VALUES (
    uuid_generate_v4(),
    'Tumkur Agricultural Zone',
    ST_GeomFromText('POLYGON((76.9 13.3, 77.1 13.3, 77.1 13.5, 76.9 13.5, 76.9 13.3))', 4326),
    NOW()
);

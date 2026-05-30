CREATE TABLE IF NOT EXISTS ingest_jobs (
    id UUID PRIMARY KEY,
    field_id UUID NOT NULL,
    date1 VARCHAR(255),
    date2 VARCHAR(255),
    status VARCHAR(50),
    ndvi_delta_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

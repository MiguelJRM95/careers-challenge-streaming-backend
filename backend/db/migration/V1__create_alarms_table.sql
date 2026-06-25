CREATE TABLE alarms (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    dedup_bucket BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, dedup_bucket)
);

CREATE INDEX idx_alarms_ts ON alarms (ts);

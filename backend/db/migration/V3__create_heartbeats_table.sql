CREATE TABLE heartbeats (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, ts)
);

-- Serves findHealth's MAX(ts)/COUNT(*) FILTER per device in one index scan;
-- ts DESC matches the most common read pattern (latest heartbeat first).
CREATE INDEX idx_heartbeats_device_ts ON heartbeats (device_id, ts DESC);

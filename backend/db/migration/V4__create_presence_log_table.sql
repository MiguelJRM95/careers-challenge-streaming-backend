CREATE TABLE presence_log (
    id BIGSERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    in_room BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, ts)
);

-- Serves both findCurrentState's ORDER BY ts DESC LIMIT 1 and
-- findOccupiedSeconds' per-room segment scan in one index.
CREATE INDEX idx_presence_log_room_ts ON presence_log (room_id, ts);

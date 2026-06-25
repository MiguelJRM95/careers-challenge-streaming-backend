-- V1's `dedup_bucket = floor(ts / 5s)` deduped by *fixed* 5s buckets, so two
-- genuinely distinct fall_warns from the same device could collapse into one
-- alarm whenever they happened to straddle the same bucket boundary - which
-- burst traffic makes common, not rare. An exclusion constraint over a
-- per-event [ts-2.5s, ts+2.5s] range makes the dedup window relative to each
-- event instead of to a fixed clock grid, and Postgres enforces it
-- atomically the same way the old UNIQUE constraint did.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE alarms DROP CONSTRAINT alarms_device_id_dedup_bucket_key;
ALTER TABLE alarms DROP COLUMN dedup_bucket;

-- `timestamptz +/- interval` is only STABLE in Postgres' catalog (interval
-- math can be timezone-sensitive in general), so it can't appear in an
-- index/exclusion expression even though our interval is a fixed number of
-- seconds. epoch_seconds() sidesteps that: a timestamptz's epoch value is
-- the same regardless of session timezone, so it's safe to mark IMMUTABLE -
-- the standard workaround for indexing on timestamptz arithmetic.
CREATE FUNCTION epoch_seconds(timestamptz) RETURNS numeric AS
    'SELECT extract(epoch FROM $1)'
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;

ALTER TABLE alarms ADD CONSTRAINT alarms_no_overlapping_falls
    EXCLUDE USING gist (
        device_id WITH =,
        numrange(epoch_seconds(ts) - 2.5, epoch_seconds(ts) + 2.5, '[]') WITH &&
    );

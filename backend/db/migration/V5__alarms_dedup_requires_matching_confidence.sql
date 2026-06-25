-- Two fall_warns within the same sliding window can be genuinely distinct
-- falls rather than sensor jitter of the same fall; confidence is part of
-- what the device is reporting, so only collapse the window-overlap into
-- one alarm when confidence also matches.
ALTER TABLE alarms DROP CONSTRAINT alarms_no_overlapping_falls;

ALTER TABLE alarms ADD CONSTRAINT alarms_no_overlapping_falls
    EXCLUDE USING gist (
        device_id WITH =,
        confidence WITH =,
        numrange(epoch_seconds(ts) - 2.5, epoch_seconds(ts) + 2.5, '[]') WITH &&
    );

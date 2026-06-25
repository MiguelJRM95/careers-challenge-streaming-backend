/**
 * A deduplicated fall_warn alarm as persisted and returned by the feed.
 * `ts` carries the original event timestamp, not the arrival/insert time.
 */
export interface Alarm {
  device_id: string;
  room_id: string;
  ts: string;
  confidence: number;
}

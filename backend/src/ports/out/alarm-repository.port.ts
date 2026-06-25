import type { Alarm } from "../../domain/models/alarm.ts";

/**
 * Outbound port: how the domain persists/reads alarms, regardless of the
 * storage engine. Dedup is enforced by the repository itself (atomic
 * insert), since that's the only way to make it correct under concurrency.
 */
export interface AlarmRepositoryPort {
  /**
   * Inserts the alarm unless one already exists for the same device within
   * the dedup window of this alarm's `ts`. Returns whether the row was
   * newly inserted, so the caller can distinguish a fresh fall from
   * sensor-jitter duplicates.
   */
  insert(alarm: Alarm): Promise<boolean>;

  /**
   * All alarms with `ts >= since`, ordered by `room_id, ts ASC`.
   */
  findSince(since: Date): Promise<Alarm[]>;
}

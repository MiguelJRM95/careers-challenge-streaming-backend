/**
 * Outbound port: how the domain persists/reads heartbeats, regardless of
 * the storage engine. Health is always recomputed from stored rows on read,
 * never tracked incrementally — a late-arriving heartbeat needs no special
 * fixup, it just lands in the same query the next time health is read.
 */
export interface HeartbeatRepositoryPort {
  /**
   * Inserts the heartbeat unless one already exists for the same device at
   * the same `ts` (an exact replay of an already-seen heartbeat).
   */
  insert(deviceId: string, roomId: string, ts: string): Promise<void>;

  /**
   * The device's latest heartbeat `ts` and how many heartbeats it has sent
   * since `since`, used to derive the rolling 5-minute availability.
   * `latest` is null when the device has never sent a heartbeat.
   */
  findHealth(deviceId: string, since: Date): Promise<{ latest: Date | null; countSince: number }>;
}

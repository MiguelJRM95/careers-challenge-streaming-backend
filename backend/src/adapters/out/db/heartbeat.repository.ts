import type { Pool } from "pg";
import type { HeartbeatRepositoryPort } from "../../../ports/out/heartbeat-repository.port.ts";

export class PostgresHeartbeatRepository implements HeartbeatRepositoryPort {
  constructor(private readonly db: Pool) {}

  async insert(deviceId: string, roomId: string, ts: string): Promise<void> {
    await this.db.query(
      `INSERT INTO heartbeats (device_id, room_id, ts)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_id, ts) DO NOTHING`,
      [deviceId, roomId, ts],
    );
  }

  async findHealth(deviceId: string, since: Date): Promise<{ latest: Date | null; countSince: number }> {
    const { rows } = await this.db.query<{ latest: Date | null; count_since: string }>(
      `SELECT MAX(ts) AS latest, COUNT(*) FILTER (WHERE ts > $2) AS count_since
       FROM heartbeats
       WHERE device_id = $1`,
      [deviceId, since],
    );
    const row = rows[0];
    return { latest: row?.latest ?? null, countSince: Number(row?.count_since ?? 0) };
  }
}

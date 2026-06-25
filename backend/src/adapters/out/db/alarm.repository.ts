import type { Pool } from "pg";
import type { Alarm } from "../../../domain/models/alarm.ts";
import type { AlarmRepositoryPort } from "../../../ports/out/alarm-repository.port.ts";

export class PostgresAlarmRepository implements AlarmRepositoryPort {
  constructor(private readonly db: Pool) {}

  async insert(alarm: Alarm): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `INSERT INTO alarms (device_id, room_id, ts, confidence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT alarms_no_overlapping_falls DO NOTHING`,
      [alarm.device_id, alarm.room_id, alarm.ts, alarm.confidence],
    );
    return rowCount !== null && rowCount > 0;
  }

  async findSince(since: Date): Promise<Alarm[]> {
    const { rows } = await this.db.query<Alarm>(
      `SELECT device_id, room_id, ts, confidence
       FROM alarms
       WHERE ts >= $1
       ORDER BY room_id, ts ASC`,
      [since],
    );
    return rows;
  }
}

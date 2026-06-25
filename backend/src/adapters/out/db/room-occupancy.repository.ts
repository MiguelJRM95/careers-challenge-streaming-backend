import type { Pool } from "pg";
import type { RoomOccupancyRepositoryPort } from "../../../ports/out/room-occupancy-repository.port.ts";

export class PostgresRoomOccupancyRepository implements RoomOccupancyRepositoryPort {
  constructor(private readonly db: Pool) {}

  async insert(roomId: string, ts: string, inRoom: boolean): Promise<void> {
    await this.db.query(
      `INSERT INTO presence_log (room_id, ts, in_room)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_id, ts) DO NOTHING`,
      [roomId, ts, inRoom],
    );
  }

  async findCurrentState(roomId: string): Promise<{ in_room: boolean } | null> {
    const { rows } = await this.db.query<{ in_room: boolean }>(
      `SELECT in_room FROM presence_log WHERE room_id = $1 ORDER BY ts DESC LIMIT 1`,
      [roomId],
    );
    return rows[0] ?? null;
  }

  async findOccupiedSeconds(roomId: string, windowStart: Date, windowEnd: Date): Promise<number> {
    // Builds segments [ts, next_ts) from every presence change up to
    // windowEnd, then sums the in_room segments clipped to [windowStart,
    // windowEnd]. A segment that started before windowStart (GREATEST) or
    // has no later event yet (COALESCE next_ts -> windowEnd) is handled the
    // same way, so a room that's been occupied since before the window
    // still counts for the portion inside it.
    const { rows } = await this.db.query<{ occupied_secs: string }>(
      `WITH relevant AS (
         SELECT ts, in_room
         FROM presence_log
         WHERE room_id = $1 AND ts <= $3
       ),
       segments AS (
         SELECT
           ts,
           in_room,
           COALESCE(LEAD(ts) OVER (ORDER BY ts), $3::timestamptz) AS next_ts
         FROM relevant
       )
       SELECT COALESCE(SUM(
         EXTRACT(EPOCH FROM (
           LEAST(next_ts, $3::timestamptz) - GREATEST(ts, $2::timestamptz)
         ))
       ) FILTER (WHERE in_room), 0) AS occupied_secs
       FROM segments
       WHERE next_ts > $2::timestamptz`,
      [roomId, windowStart, windowEnd],
    );
    return Number(rows[0]?.occupied_secs ?? 0);
  }
}

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { env } from "../../src/config/env.ts";
import { PostgresRoomOccupancyRepository } from "../../src/adapters/out/db/room-occupancy.repository.ts";
import { RoomOccupancyService } from "../../src/domain/service/occupancy/room-occupancy.service.ts";

const ONE_SECOND_MS = 1_000;
const TEN_MINUTES_MS = 10 * 60 * ONE_SECOND_MS;

// Exercises RF-2 against a real PostgreSQL instance (the one started by
// `docker-compose up postgres`, migrated by the flyway service in
// db/migration) instead of a fake repository, so the segment-building query
// is verified against the actual schema.
describe("RoomOccupancyService against PostgreSQL", () => {
  const db = new Pool({ connectionString: env.databaseUrl, max: 5 });
  const repository = new PostgresRoomOccupancyRepository(db);
  const service = new RoomOccupancyService(repository);

  beforeAll(async () => {
    const client = await db.connect();
    client.release();
  });

  afterEach(async () => {
    await db.query("DELETE FROM presence_log");
  });

  afterAll(async () => {
    await db.end();
  });

  it("given no presence events for a room, when its occupancy is read, then it returns null", async () => {
    const result = await service.getOccupancy("room_integration_unknown", "1m");

    expect(result).toBeNull();
  });

  it("given the room has been occupied since well before the window, when its occupancy is read, then occupancy_pct is capped at 100", async () => {
    const ts = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
    await service.onPresence({ device_id: "dev_1", room_id: "room_occupied", type: "presence", ts, seq: 1, in_room: true });

    const result = await service.getOccupancy("room_occupied", "1m");

    expect(result?.in_room).toBe(true);
    expect(result?.occupancy_pct).toBe(100);
  });

  it("given the room has been vacant since well before the window, when its occupancy is read, then occupancy_pct is 0", async () => {
    const ts = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
    await service.onPresence({ device_id: "dev_1", room_id: "room_vacant", type: "presence", ts, seq: 1, in_room: false });

    const result = await service.getOccupancy("room_vacant", "1m");

    expect(result?.in_room).toBe(false);
    expect(result?.occupancy_pct).toBe(0);
  });

  it("given presence toggled on then off inside the window, when its occupancy is read, then occupancy_pct reflects only the occupied segment", async () => {
    const enteredAt = new Date(Date.now() - 40 * ONE_SECOND_MS).toISOString();
    const leftAt = new Date(Date.now() - 20 * ONE_SECOND_MS).toISOString();
    await service.onPresence({ device_id: "dev_1", room_id: "room_toggle", type: "presence", ts: enteredAt, seq: 1, in_room: true });
    await service.onPresence({ device_id: "dev_1", room_id: "room_toggle", type: "presence", ts: leftAt, seq: 2, in_room: false });

    const result = await service.getOccupancy("room_toggle", "1m");

    // Occupied for ~20s out of a 60s window (~33%); a few ms of test/query
    // latency is tolerated rather than asserting an exact figure.
    expect(result?.in_room).toBe(false);
    expect(result?.occupancy_pct).toBeGreaterThan(28);
    expect(result?.occupancy_pct).toBeLessThan(38);
  });

  it("given a late presence event arrives out of ts order, when its occupancy is read, then it retroactively corrects the occupied window instead of the stale history", async () => {
    const enteredAt = new Date(Date.now() - 20 * ONE_SECOND_MS).toISOString();
    const earlierVacantAt = new Date(Date.now() - 50 * ONE_SECOND_MS).toISOString();

    // Arrival order is deliberately reversed: the more recent event lands
    // first, then the earlier "vacant" event arrives late — mirroring a
    // device replaying its offline buffer out of ts order.
    await service.onPresence({ device_id: "dev_1", room_id: "room_late", type: "presence", ts: enteredAt, seq: 2, in_room: true });
    await service.onPresence({ device_id: "dev_1", room_id: "room_late", type: "presence", ts: earlierVacantAt, seq: 1, in_room: false });

    const result = await service.getOccupancy("room_late", "1m");

    // Current state still reflects the latest ts (occupied), and the
    // occupied portion of the window is the ~20s since enteredAt, not the
    // full window — the late vacant event corrected the segment before it.
    expect(result?.in_room).toBe(true);
    expect(result?.occupancy_pct).toBeGreaterThan(28);
    expect(result?.occupancy_pct).toBeLessThan(38);
  });

  it("given a presence event replayed with the exact same ts after reconnect, when its occupancy is read, then the duplicate does not change the result", async () => {
    const ts = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
    const event = { device_id: "dev_1", room_id: "room_dedup", type: "presence" as const, ts, seq: 1, in_room: true };

    await service.onPresence(event);
    await service.onPresence(event); // exact replay of the same presence event

    const result = await service.getOccupancy("room_dedup", "1m");

    expect(result?.in_room).toBe(true);
    expect(result?.occupancy_pct).toBe(100);
  });
});

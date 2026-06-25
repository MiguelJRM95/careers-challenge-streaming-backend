import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { env } from "../../src/config/env.ts";
import { PostgresHeartbeatRepository } from "../../src/adapters/out/db/heartbeat.repository.ts";
import { DeviceHealthService } from "../../src/domain/service/health/device-health.service.ts";

const ONE_MINUTE_MS = 60_000;
const AVAILABILITY_WINDOW_MINUTES = 5;
// Mirrors DeviceHealthService's EXPECTED_HEARTBEATS_5M: the ~1Hz heartbeat
// rate expected over the 5-minute availability window.
const EXPECTED_HEARTBEATS_5M = 300;

// Same rounding the service applies, so expectations stay in lockstep with
// its output instead of hardcoding pre-computed percentages.
const expectedAvailability = (heartbeatsInWindow: number): number =>
  Math.round((heartbeatsInWindow / EXPECTED_HEARTBEATS_5M) * 100 * 100) / 100;

// Exercises RF-1 against a real PostgreSQL instance (the one started by
// `docker-compose up postgres`, migrated by the flyway service in
// db/migration) instead of a fake repository, so the dedup constraint and
// the MAX(ts)/COUNT(*) FILTER query are verified against the actual schema.
describe("DeviceHealthService against PostgreSQL", () => {
  const db = new Pool({ connectionString: env.databaseUrl, max: 5 });
  const repository = new PostgresHeartbeatRepository(db);
  const service = new DeviceHealthService(repository);

  beforeAll(async () => {
    const client = await db.connect();
    client.release();
  });

  afterEach(async () => {
    await db.query("DELETE FROM heartbeats");
  });

  afterAll(async () => {
    await db.end();
  });

  it("given no heartbeats for a device, when its health is read, then it returns null", async () => {
    const result = await service.getHealth("dev_integration_unknown");

    expect(result).toBeNull();
  });

  it("given a single recent heartbeat, when its health is read, then latest_heartbeat reflects it and availability_5m is its share of the expected rate", async () => {
    const ts = new Date(Date.now() - ONE_MINUTE_MS).toISOString();
    await service.onHeartbeat({ device_id: "dev_integration_1", room_id: "room_1", type: "heartbeat", ts, seq: 1 });

    const result = await service.getHealth("dev_integration_1");

    expect(result?.latest_heartbeat).toBe(ts);
    expect(result?.availability_5m).toBe(expectedAvailability(1));
  });

  it("given a heartbeat replayed with the exact same ts after reconnect, when its health is read, then the duplicate is not double-counted", async () => {
    const ts = new Date(Date.now() - ONE_MINUTE_MS).toISOString();
    const event = { device_id: "dev_integration_2", room_id: "room_1", type: "heartbeat" as const, ts, seq: 1 };

    await service.onHeartbeat(event);
    await service.onHeartbeat(event); // exact replay of the same heartbeat

    const result = await service.getHealth("dev_integration_2");

    expect(result?.availability_5m).toBe(expectedAvailability(1));
  });

  it("given a late heartbeat inserted after a more recent one, when its health is read, then latest_heartbeat is the max ts, not the arrival order", async () => {
    const earlier = new Date(Date.now() - (AVAILABILITY_WINDOW_MINUTES - 1) * ONE_MINUTE_MS).toISOString();
    const later = new Date(Date.now() - ONE_MINUTE_MS).toISOString();

    // Arrival order is deliberately reversed: the later event is inserted
    // first, then the "late" earlier one arrives — mirroring a device
    // replaying its offline buffer out of ts order.
    await service.onHeartbeat({ device_id: "dev_integration_3", room_id: "room_1", type: "heartbeat", ts: later, seq: 2 });
    await service.onHeartbeat({ device_id: "dev_integration_3", room_id: "room_1", type: "heartbeat", ts: earlier, seq: 1 });

    const result = await service.getHealth("dev_integration_3");

    expect(result?.latest_heartbeat).toBe(later);
    expect(result?.availability_5m).toBe(expectedAvailability(2));
  });

  it("given a heartbeat older than the 5-minute window, when its health is read, then it does not count toward availability_5m", async () => {
    const stale = new Date(Date.now() - (AVAILABILITY_WINDOW_MINUTES + 5) * ONE_MINUTE_MS).toISOString();
    await service.onHeartbeat({ device_id: "dev_integration_4", room_id: "room_1", type: "heartbeat", ts: stale, seq: 1 });

    const result = await service.getHealth("dev_integration_4");

    expect(result?.latest_heartbeat).toBe(stale);
    expect(result?.availability_5m).toBe(expectedAvailability(0));
  });
});

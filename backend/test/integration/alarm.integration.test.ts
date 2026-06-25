import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { env } from "../../src/config/env.ts";
import { PostgresAlarmRepository } from "../../src/adapters/out/db/alarm.repository.ts";
import { AlarmService } from "../../src/domain/service/alarms/alarm.service.ts";
import type { ValidatedEvent } from "../../src/domain/models/event.ts";

type FallWarnEvent = Extract<ValidatedEvent, { type: "fall_warn" }>;

const fallWarn = (overrides: Partial<FallWarnEvent> = {}): FallWarnEvent => ({
  device_id: "dev_integration",
  room_id: "room_14",
  type: "fall_warn",
  ts: "2026-06-24T18:00:00.000Z",
  seq: 1,
  confidence: 0.92,
  ...overrides,
});

// Exercises RF-3/RF-4 against a real PostgreSQL instance (the one started by
// `docker-compose up postgres`, migrated by the flyway service in
// db/migration) instead of a fake repository, so the exclusion constraint is
// verified against the actual schema.
describe("AlarmService against PostgreSQL", () => {
  const db = new Pool({ connectionString: env.databaseUrl, max: 5 });
  const repository = new PostgresAlarmRepository(db);
  const service = new AlarmService(repository);

  beforeAll(async () => {
    const client = await db.connect();
    client.release();
  });

  afterEach(async () => {
    await db.query("DELETE FROM alarms");
  });

  afterAll(async () => {
    await db.end();
  });

  it("given two fall_warns from the same device within the window with the same confidence, when both are processed, then only one alarm is emitted", async () => {
    await service.onFallWarn(fallWarn({ ts: "2026-06-24T18:00:00.000Z", confidence: 0.92 }));
    await service.onFallWarn(fallWarn({ ts: "2026-06-24T18:00:01.000Z", confidence: 0.92 }));

    const { rows } = await db.query("SELECT count(*)::int AS count FROM alarms WHERE device_id = 'dev_integration'");

    expect(rows[0].count).toBe(1);
  });

  it("given two fall_warns from the same device within the window but with different confidence, when both are processed, then both are treated as distinct falls", async () => {
    await service.onFallWarn(fallWarn({ ts: "2026-06-24T18:00:00.000Z", confidence: 0.92 }));
    await service.onFallWarn(fallWarn({ ts: "2026-06-24T18:00:01.000Z", confidence: 0.55 }));

    const { rows } = await db.query("SELECT count(*)::int AS count FROM alarms WHERE device_id = 'dev_integration'");

    expect(rows[0].count).toBe(2);
  });
});

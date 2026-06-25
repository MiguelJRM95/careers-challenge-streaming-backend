import { describe, expect, it, vi } from "vitest";
import { AlarmService } from "../../../src/domain/service/alarms/alarm.service.ts";
import type { Alarm } from "../../../src/domain/models/alarm.ts";
import type { AlarmRepositoryPort } from "../../../src/ports/out/alarm-repository.port.ts";
import type { ValidatedEvent } from "../../../src/domain/models/event.ts";

type FallWarnEvent = Extract<ValidatedEvent, { type: "fall_warn" }>;

const fallWarn = (overrides: Partial<FallWarnEvent> = {}): FallWarnEvent => ({
  device_id: "dev_0001",
  room_id: "room_14",
  type: "fall_warn",
  ts: "2026-06-24T18:00:00.000Z",
  seq: 1,
  confidence: 0.92,
  ...overrides,
});

describe("AlarmService", () => {
  it("maps a fall_warn event onto an Alarm and asks the repository to insert it", async () => {
    const insert = vi.fn().mockResolvedValue(true);
    const repository: AlarmRepositoryPort = { insert, findSince: vi.fn() };
    const service = new AlarmService(repository);

    await service.onFallWarn(fallWarn({ ts: "2026-06-24T18:00:02.500Z" }));

    expect(insert).toHaveBeenCalledWith({
      device_id: "dev_0001",
      room_id: "room_14",
      ts: "2026-06-24T18:00:02.500Z",
      confidence: 0.92,
    });
  });

  it("feed('0') asks the repository for everything since the epoch", async () => {
    const alarms: Alarm[] = [{ device_id: "dev_0001", room_id: "room_14", ts: "2026-06-24T18:00:00.000Z", confidence: 0.92 }];
    const findSince = vi.fn().mockResolvedValue(alarms);
    const service = new AlarmService({ insert: vi.fn(), findSince });

    const result = await service.feed("0");

    expect(findSince).toHaveBeenCalledWith(new Date(0));
    expect(result).toBe(alarms);
  });

  it("feed(<iso ts>) passes the parsed date through to the repository", async () => {
    const findSince = vi.fn().mockResolvedValue([]);
    const service = new AlarmService({ insert: vi.fn(), findSince });

    await service.feed("2026-06-24T18:00:00.000Z");

    expect(findSince).toHaveBeenCalledWith(new Date("2026-06-24T18:00:00.000Z"));
  });
});

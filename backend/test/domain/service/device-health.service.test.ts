import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceHealthService } from "../../../src/domain/service/health/device-health.service.ts";
import type { HeartbeatRepositoryPort } from "../../../src/ports/out/heartbeat-repository.port.ts";
import type { ValidatedEvent } from "../../../src/domain/models/event.ts";

type HeartbeatEvent = Extract<ValidatedEvent, { type: "heartbeat" }>;

const heartbeat = (overrides: Partial<HeartbeatEvent> = {}): HeartbeatEvent => ({
  device_id: "dev_0001",
  room_id: "room_14",
  type: "heartbeat",
  ts: "2026-06-25T12:00:00.000Z",
  seq: 1,
  ...overrides,
});

const NOW = new Date("2026-06-25T12:00:00.000Z");

describe("DeviceHealthService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("given a heartbeat event, when onHeartbeat is called, then it inserts the heartbeat with its own ts and room", async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const repository: HeartbeatRepositoryPort = { insert, findHealth: vi.fn() };
    const service = new DeviceHealthService(repository);

    await service.onHeartbeat(heartbeat({ device_id: "dev_0001", room_id: "room_14", ts: "2026-06-25T11:59:50.000Z" }));

    expect(insert).toHaveBeenCalledWith("dev_0001", "room_14", "2026-06-25T11:59:50.000Z");
  });

  it("given a device that has never sent a heartbeat, when getHealth is called, then it returns null", async () => {
    const findHealth = vi.fn().mockResolvedValue({ latest: null, countSince: 0 });
    const service = new DeviceHealthService({ insert: vi.fn(), findHealth });

    const result = await service.getHealth("dev_unknown");

    expect(findHealth).toHaveBeenCalledWith("dev_unknown", new Date(NOW.getTime() - 5 * 60 * 1000));
    expect(result).toBeNull();
  });

  it("given 300 heartbeats received in the last 5 minutes, when getHealth is called, then availability_5m is 100", async () => {
    const findHealth = vi.fn().mockResolvedValue({ latest: NOW, countSince: 300 });
    const service = new DeviceHealthService({ insert: vi.fn(), findHealth });

    const result = await service.getHealth("dev_0001");

    expect(result).toEqual({
      device_id: "dev_0001",
      latest_heartbeat: NOW.toISOString(),
      availability_5m: 100,
    });
  });

  it("given only 150 heartbeats received in the last 5 minutes, when getHealth is called, then availability_5m is 50", async () => {
    const findHealth = vi.fn().mockResolvedValue({ latest: NOW, countSince: 150 });
    const service = new DeviceHealthService({ insert: vi.fn(), findHealth });

    const result = await service.getHealth("dev_0001");

    expect(result?.availability_5m).toBe(50);
  });

  it("given a device replaying buffered heartbeats and exceeding the expected rate, when getHealth is called, then availability_5m is capped at 100", async () => {
    const findHealth = vi.fn().mockResolvedValue({ latest: NOW, countSince: 450 });
    const service = new DeviceHealthService({ insert: vi.fn(), findHealth });

    const result = await service.getHealth("dev_0001");

    expect(result?.availability_5m).toBe(100);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomOccupancyService } from "../../../src/domain/service/occupancy/room-occupancy.service.ts";
import type { RoomOccupancyRepositoryPort } from "../../../src/ports/out/room-occupancy-repository.port.ts";
import type { ValidatedEvent } from "../../../src/domain/models/event.ts";

type PresenceEvent = Extract<ValidatedEvent, { type: "presence" }>;

const presence = (overrides: Partial<PresenceEvent> = {}): PresenceEvent => ({
  device_id: "dev_0001",
  room_id: "room_14",
  type: "presence",
  ts: "2026-06-25T12:00:00.000Z",
  seq: 1,
  in_room: true,
  ...overrides,
});

const NOW = new Date("2026-06-25T12:00:00.000Z");

describe("RoomOccupancyService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("given a presence event, when onPresence is called, then it inserts the event with its own ts and in_room", async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const repository: RoomOccupancyRepositoryPort = { insert, findCurrentState: vi.fn(), findOccupiedSeconds: vi.fn() };
    const service = new RoomOccupancyService(repository);

    await service.onPresence(presence({ room_id: "room_14", ts: "2026-06-25T11:59:50.000Z", in_room: false }));

    expect(insert).toHaveBeenCalledWith("room_14", "2026-06-25T11:59:50.000Z", false);
  });

  it("given a room that has never received a presence event, when getOccupancy is called, then it returns null", async () => {
    const findCurrentState = vi.fn().mockResolvedValue(null);
    const service = new RoomOccupancyService({
      insert: vi.fn(),
      findCurrentState,
      findOccupiedSeconds: vi.fn(),
    });

    const result = await service.getOccupancy("room_unknown", "5m");

    expect(findCurrentState).toHaveBeenCalledWith("room_unknown");
    expect(result).toBeNull();
  });

  it("given a room occupied for the full window, when getOccupancy is called, then occupancy_pct is 100 and in_room reflects the latest state", async () => {
    const findCurrentState = vi.fn().mockResolvedValue({ in_room: true });
    const findOccupiedSeconds = vi.fn().mockResolvedValue(5 * 60);
    const service = new RoomOccupancyService({ insert: vi.fn(), findCurrentState, findOccupiedSeconds });

    const result = await service.getOccupancy("room_14", "5m");

    expect(findOccupiedSeconds).toHaveBeenCalledWith("room_14", new Date(NOW.getTime() - 5 * 60_000), NOW);
    expect(result).toEqual({
      room_id: "room_14",
      in_room: true,
      window: "5m",
      occupancy_pct: 100,
    });
  });

  it("given a room occupied for half the window, when getOccupancy is called, then occupancy_pct is 50", async () => {
    const findCurrentState = vi.fn().mockResolvedValue({ in_room: false });
    const findOccupiedSeconds = vi.fn().mockResolvedValue(30);
    const service = new RoomOccupancyService({ insert: vi.fn(), findCurrentState, findOccupiedSeconds });

    const result = await service.getOccupancy("room_14", "1m");

    expect(result?.occupancy_pct).toBe(50);
  });

  it("given occupied seconds that round-trip past the window length, when getOccupancy is called, then occupancy_pct is capped at 100", async () => {
    const findCurrentState = vi.fn().mockResolvedValue({ in_room: true });
    const findOccupiedSeconds = vi.fn().mockResolvedValue(3601);
    const service = new RoomOccupancyService({ insert: vi.fn(), findCurrentState, findOccupiedSeconds });

    const result = await service.getOccupancy("room_14", "1h");

    expect(result?.occupancy_pct).toBe(100);
  });
});

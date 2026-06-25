import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createRoomOccupancyController } from "../../../../../src/adapters/in/http/rooms/room-occupancy.controller.ts";
import { resourceNotFoundTotal } from "../../../../../src/config/metrics.ts";
import type { RoomOccupancyPort } from "../../../../../src/ports/in/room-occupancy.port.ts";
import type { RoomOccupancy } from "../../../../../src/domain/models/room-occupancy.ts";

function buildApp(roomOccupancyPort: RoomOccupancyPort) {
  const app = express();
  app.use(createRoomOccupancyController(roomOccupancyPort));
  return app;
}

describe("GET /rooms/:room_id/occupancy", () => {
  it("given a room with presence history, when its occupancy is requested with a valid window, then it returns the occupancy payload", async () => {
    const occupancy: RoomOccupancy = {
      room_id: "room_14",
      in_room: true,
      window: "5m",
      occupancy_pct: 87.5,
    };
    const getOccupancy = vi.fn().mockResolvedValue(occupancy);
    const app = buildApp({ getOccupancy });

    const res = await request(app).get("/rooms/room_14/occupancy?window=5m");

    expect(getOccupancy).toHaveBeenCalledWith("room_14", "5m");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(occupancy);
  });

  it("given a room that has never received a presence event, when its occupancy is requested, then it responds 404 and counts the miss", async () => {
    const getOccupancy = vi.fn().mockResolvedValue(null);
    const app = buildApp({ getOccupancy });
    const before = (await resourceNotFoundTotal.get()).values.find((v) => v.labels.resource === "room")?.value ?? 0;

    const res = await request(app).get("/rooms/room_unknown/occupancy?window=1h");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "room_not_found" });
    const after = (await resourceNotFoundTotal.get()).values.find((v) => v.labels.resource === "room")?.value ?? 0;
    expect(after).toBe(before + 1);
  });

  it("rejects a window that is not one of '1m', '5m', '1h'", async () => {
    const getOccupancy = vi.fn();
    const app = buildApp({ getOccupancy });

    const res = await request(app).get("/rooms/room_14/occupancy?window=10m");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_window", detail: "window must be one of '1m', '5m', '1h'" });
    expect(getOccupancy).not.toHaveBeenCalled();
  });

  it("rejects a request with a missing window", async () => {
    const getOccupancy = vi.fn();
    const app = buildApp({ getOccupancy });

    const res = await request(app).get("/rooms/room_14/occupancy");

    expect(res.status).toBe(400);
    expect(getOccupancy).not.toHaveBeenCalled();
  });
});

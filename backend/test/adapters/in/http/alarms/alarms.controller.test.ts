import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createAlarmsController } from "../../../../../src/adapters/in/http/alarms/alarms.controller.ts";
import type { AlarmsPort } from "../../../../../src/ports/in/alarm-feed.port.ts";
import type { Alarm } from "../../../../../src/domain/models/alarm.ts";

function buildApp(alarmsPort: AlarmsPort) {
  const app = express();
  app.use(createAlarmsController(alarmsPort));
  return app;
}

describe("GET /alarms", () => {
  it("always responds with { alarms: [...] }", async () => {
    const feed = vi.fn().mockResolvedValue([]);
    const app = buildApp({ feed });

    const res = await request(app).get("/alarms?since=0");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ alarms: [] });
    expect(feed).toHaveBeenCalledWith("0");
  });

  it("defaults since to '0' when omitted", async () => {
    const feed = vi.fn().mockResolvedValue([]);
    const app = buildApp({ feed });

    await request(app).get("/alarms");

    expect(feed).toHaveBeenCalledWith("0");
  });

  it("forwards an ISO since timestamp to the port and returns its alarms", async () => {
    const alarms: Alarm[] = [{ device_id: "dev_0001", room_id: "room_14", ts: "2026-06-24T18:00:00.000Z", confidence: 0.92 }];
    const feed = vi.fn().mockResolvedValue(alarms);
    const app = buildApp({ feed });

    const res = await request(app).get("/alarms?since=2026-06-24T17:00:00.000Z");

    expect(feed).toHaveBeenCalledWith("2026-06-24T17:00:00.000Z");
    expect(res.body).toEqual({ alarms });
  });

  it("rejects a since that is neither '0' nor an ISO timestamp", async () => {
    const feed = vi.fn();
    const app = buildApp({ feed });

    const res = await request(app).get("/alarms?since=not-a-date");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_since", detail: "since must be '0' or an ISO timestamp" });
    expect(feed).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createDeviceHealthController } from "../../../../../src/adapters/in/http/devices/device-health.controller.ts";
import type { DeviceHealthPort } from "../../../../../src/ports/in/device-health.port.ts";
import type { DeviceHealth } from "../../../../../src/domain/models/device-health.ts";

function buildApp(deviceHealthPort: DeviceHealthPort) {
  const app = express();
  app.use(createDeviceHealthController(deviceHealthPort));
  return app;
}

describe("GET /devices/:device_id/health", () => {
  it("given a device with stored heartbeats, when its health is requested, then it returns the health payload", async () => {
    const health: DeviceHealth = {
      device_id: "dev_0001",
      latest_heartbeat: "2026-06-25T12:00:00.000Z",
      availability_5m: 87.5,
    };
    const getHealth = vi.fn().mockResolvedValue(health);
    const app = buildApp({ getHealth });

    const res = await request(app).get("/devices/dev_0001/health");

    expect(getHealth).toHaveBeenCalledWith("dev_0001");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(health);
  });

  it("given a device that has never sent a heartbeat, when its health is requested, then it responds 404", async () => {
    const getHealth = vi.fn().mockResolvedValue(null);
    const app = buildApp({ getHealth });

    const res = await request(app).get("/devices/dev_unknown/health");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "device_not_found" });
  });
});

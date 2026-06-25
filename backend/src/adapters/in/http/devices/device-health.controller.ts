import { Router } from "express";
import type { DeviceHealthPort } from "../../../../ports/in/device-health.port.ts";

/**
 * HTTP adapter for RF-1: GET /devices/{device_id}/health. 404s when the
 * device has never sent a heartbeat, since there is nothing to report yet.
 */
export function createDeviceHealthController(deviceHealthPort: DeviceHealthPort): Router {
  const router = Router();

  router.get("/devices/:device_id/health", async (req, res) => {
    const health = await deviceHealthPort.getHealth(req.params.device_id);
    if (!health) {
      res.status(404).json({ error: "device_not_found" });
      return;
    }
    res.status(200).json(health);
  });

  return router;
}

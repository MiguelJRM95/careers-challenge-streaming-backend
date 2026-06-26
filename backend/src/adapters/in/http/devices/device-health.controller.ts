import { Router } from "express";
import type { DeviceHealthPort } from "../../../../ports/in/device-health.port.ts";
import { resourceNotFoundTotal } from "../../../../config/metrics.ts";

export function createDeviceHealthController(deviceHealthPort: DeviceHealthPort): Router {
  const router = Router();

  router.get("/devices/:device_id/health", async (req, res) => {
    const health = await deviceHealthPort.getHealth(req.params.device_id);
    if (!health) {
      resourceNotFoundTotal.inc({ resource: "device" });
      res.status(404).json({ error: "device_not_found" });
      return;
    }
    res.status(200).json(health);
  });

  return router;
}

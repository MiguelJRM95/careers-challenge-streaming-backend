import { Router } from "express";
import { z } from "zod";
import type { AlarmsPort } from "../../../../ports/in/alarm-feed.port.ts";
import { requestDurationMiddleware } from "../core/request-duration.middleware.ts";

// ts validation accepting 0 for start-of-time.
const sinceSchema = z.literal("0").or(z.iso.datetime({ offset: true })).default("0");

export function createAlarmsController(alarmsPort: AlarmsPort): Router {
  const router = Router();

  router.get("/alarms", requestDurationMiddleware, async (req, res) => {
    const parsed = sinceSchema.safeParse(req.query.since);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_since", detail: "since must be '0' or an ISO timestamp" });
      return;
    }

    const alarms = await alarmsPort.feed(parsed.data);
    res.status(200).json({ alarms });
  });

  return router;
}

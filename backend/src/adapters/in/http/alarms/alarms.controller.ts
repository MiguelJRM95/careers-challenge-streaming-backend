import { Router } from "express";
import { z } from "zod";
import type { AlarmsPort } from "../../../../ports/in/alarm-feed.port.ts";

// "0" is the scorer's sentinel for "everything since the beginning"; any
// other value must be an ISO timestamp. Validated here so a malformed
// `since` fails loudly with a 400 instead of silently becoming an
// `Invalid Date` that reaches the repository's query.
const sinceSchema = z.literal("0").or(z.iso.datetime({ offset: true })).default("0");

/**
 * HTTP adapter for RF-4: GET /alarms?since=<ts>. `since=0` returns every
 * alarm recorded; any other value is treated as an ISO timestamp lower
 * bound. Always responds with `{ alarms: [...] }`, including on a missing
 * `since` (defaulted to "0") so the scorer's plain GET never has to special
 * case it.
 */
export function createAlarmsController(alarmsPort: AlarmsPort): Router {
  const router = Router();

  router.get("/alarms", async (req, res) => {
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

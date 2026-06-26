import { Router } from "express";
import { z } from "zod";
import { OCCUPANCY_WINDOWS } from "../../../../domain/models/room-occupancy.ts";
import type { RoomOccupancyPort } from "../../../../ports/in/room-occupancy.port.ts";
import { resourceNotFoundTotal } from "../../../../config/metrics.ts";

const windowSchema = z.enum(OCCUPANCY_WINDOWS);

export function createRoomOccupancyController(roomOccupancyPort: RoomOccupancyPort): Router {
  const router = Router();

  router.get("/rooms/:room_id/occupancy", async (req, res) => {
    const parsed = windowSchema.safeParse(req.query.window);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_window", detail: "window must be one of '1m', '5m', '1h'" });
      return;
    }

    const occupancy = await roomOccupancyPort.getOccupancy(req.params.room_id, parsed.data);
    if (!occupancy) {
      resourceNotFoundTotal.inc({ resource: "room" });
      res.status(404).json({ error: "room_not_found" });
      return;
    }
    res.status(200).json(occupancy);
  });

  return router;
}

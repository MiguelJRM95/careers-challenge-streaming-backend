import { Router } from "express";
import type { ReceiveEventPort } from "../../../../ports/in/receive-event.port.ts";

/**
 * HTTP adapter: translates POST /events into a call on the inbound port.
 * Always accepts (202) at this stage; rejection rules land with validation.
 */
export function createEventsController(receiveEventPort: ReceiveEventPort): Router {
  const router = Router();

  router.post("/events", (req, res) => {
    receiveEventPort.receive(req.body);
    res.status(202).json({ status: "accepted" });
  });

  return router;
}

import { Router } from "express";
import type { ReceiveEventPort } from "../../../../ports/in/receive-event.port.ts";

/**
 * HTTP adapter: translates POST /events into a call on the inbound port.
 * Always accepts (202): under load we never reject a POST, invalid events
 * are logged and discarded inside the domain instead.
 */
export function createEventsController(receiveEventPort: ReceiveEventPort): Router {
  const router = Router();

  router.post("/events", (req, res) => {
    receiveEventPort.receive(req.body);
    res.status(202).json({ status: "accepted" });
  });

  return router;
}

import { Router } from "express";
import type { ReceiveEventPort } from "../../../../ports/in/receive-event.port.ts";

export function createEventsController(receiveEventPort: ReceiveEventPort): Router {
  const router = Router();

  router.post("/events", (req, res) => {
    receiveEventPort.receive(req.body);
    res.status(202).json({ status: "accepted" });
  });

  return router;
}

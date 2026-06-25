import express, { type Express } from "express";
import type { Server } from "node:http";
import { createEventsController } from "./../consumer/events.controller.ts";
import type { ReceiveEventPort } from "../../../../ports/in/receive-event.port.ts";
import { logger } from "../../../../config/logger.ts";
import { registry } from "../../../../config/metrics.ts";

export class HttpServer {
  readonly app: Express = express();

  constructor(private readonly port: number, receiveEventPort: ReceiveEventPort) {
    this.app.use(express.json());
    this.app.get("/health", (_req, res) => {
      res.status(200).send("OK");
    });
    this.app.get("/metrics", async (_req, res) => {
      res.set("Content-Type", registry.contentType);
      res.send(await registry.metrics());
    });
    this.app.use(createEventsController(receiveEventPort));
  }

  start(): Server {
    return this.app.listen(this.port, () => {
      logger.info(`Server is running on port ${this.port}`);
    });
  }
}

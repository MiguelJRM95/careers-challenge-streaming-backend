import express, { type Express } from "express";
import { createEventsController } from "./../consumer/events.controller.ts";
import type { ReceiveEventPort } from "../../../../ports/in/receive-event.port.ts";

export class HttpServer {
  readonly app: Express = express();

  constructor(private readonly port: number, receiveEventPort: ReceiveEventPort) {
    this.app.use(express.json());
    this.app.get("/health", (_req, res) => {
      res.status(200).send("OK");
    });
    this.app.use(createEventsController(receiveEventPort));
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
    });
  }
}

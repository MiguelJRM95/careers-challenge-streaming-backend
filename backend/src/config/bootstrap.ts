import { env } from "./env.js";
import type { ValidatedEvent } from "../domain/models/event.js";
import { PriorityQueue } from "../domain/models/priority-queue.js";
import { EventDispatcher } from "../domain/service/event-dispatcher.service.js";
import { EventWorker } from "../domain/service/event-worker.service.js";
import { IngestEventService } from "../domain/service/ingest-event.service.js";
import { HttpServer } from "../adapters/in/http/core/http-server.js";

export interface App {
  httpServer: HttpServer;
  worker: EventWorker;
  dispatcher: EventDispatcher;
}

/**
 * Composition root: wires the in-memory queue, the dispatcher and the
 * worker, then the HTTP adapter on top of the resulting inbound port.
 * Starts the worker here too, since draining the queue isn't tied to the
 * HTTP listener's lifecycle — only starting that listener is left to the
 * caller.
 */
export function buildApp(): App {
  const queue = new PriorityQueue<ValidatedEvent>();

  const dispatcher = new EventDispatcher(queue, undefined, {
    flushThreshold: env.bufferFlushThreshold,
    flushIntervalMs: env.bufferFlushIntervalMs,
  });

  const worker = new EventWorker(queue);
  worker.start();

  const ingestEventService = new IngestEventService(dispatcher);
  const httpServer = new HttpServer(env.port, ingestEventService);

  return { httpServer, worker, dispatcher };
}

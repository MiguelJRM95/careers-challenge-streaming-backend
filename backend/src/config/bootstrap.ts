import { env } from "./env.js";
import { db } from "./database.js";
import type { ValidatedEvent } from "../domain/models/event.js";
import { PriorityQueue } from "../domain/models/priority-queue.js";
import { EventDispatcher } from "../domain/service/events/event-dispatcher.service.ts";
import { EventWorker } from "../domain/service/events/event-worker.service.ts";
import { EventIngestorService } from "../domain/service/events/event-ingestor.service.ts";
import { AlarmService } from "../domain/service/alarms/alarm.service.ts";
import { PostgresAlarmRepository } from "../adapters/out/db/alarm.repository.ts";
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

  const alarmRepository = new PostgresAlarmRepository(db);
  const alarmService = new AlarmService(alarmRepository);

  const worker = new EventWorker(queue, alarmService);
  worker.start();

  const eventIngestorService = new EventIngestorService(dispatcher);
  const httpServer = new HttpServer(env.port, eventIngestorService, alarmService);

  return { httpServer, worker, dispatcher };
}

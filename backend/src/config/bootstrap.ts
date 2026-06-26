import { env } from "./env.js";
import { db } from "./database.js";
import type { ValidatedEvent } from "../domain/models/event.js";
import { PriorityQueue } from "../domain/models/priority-queue.js";
import { EventDispatcher } from "../domain/service/events/event-dispatcher.service.ts";
import { EventWorker } from "../domain/service/events/event-worker.service.ts";
import { EventIngestorService } from "../domain/service/events/event-ingestor.service.ts";
import { AlarmService } from "../domain/service/alarms/alarm.service.ts";
import { PostgresAlarmRepository } from "../adapters/out/db/alarm.repository.ts";
import { DeviceHealthService } from "../domain/service/health/device-health.service.ts";
import { PostgresHeartbeatRepository } from "../adapters/out/db/heartbeat.repository.ts";
import { RoomOccupancyService } from "../domain/service/occupancy/room-occupancy.service.ts";
import { PostgresRoomOccupancyRepository } from "../adapters/out/db/room-occupancy.repository.ts";
import { HttpServer } from "../adapters/in/http/core/http-server.js";
import { EventValidator } from "../domain/service/events/event-validator.service.ts";

export interface App {
  httpServer: HttpServer;
  worker: EventWorker;
  dispatcher: EventDispatcher;
}

export function buildApp(): App {
  const queue = new PriorityQueue<ValidatedEvent>();

  const validator: EventValidator = new EventValidator()

  const dispatcher = new EventDispatcher(queue, validator, {
    flushThreshold: env.bufferFlushThreshold,
    flushIntervalMs: env.bufferFlushIntervalMs,
  });

  const alarmRepository = new PostgresAlarmRepository(db);
  const alarmService = new AlarmService(alarmRepository);

  const heartbeatRepository = new PostgresHeartbeatRepository(db);
  const deviceHealthService = new DeviceHealthService(heartbeatRepository);

  const roomOccupancyRepository = new PostgresRoomOccupancyRepository(db);
  const roomOccupancyService = new RoomOccupancyService(roomOccupancyRepository);

  const worker = new EventWorker(queue, alarmService, deviceHealthService, roomOccupancyService);
  worker.start();

  const eventIngestorService = new EventIngestorService(dispatcher);
  const httpServer = new HttpServer(
    env.port,
    eventIngestorService,
    alarmService,
    deviceHealthService,
    roomOccupancyService,
  );

  return { httpServer, worker, dispatcher };
}

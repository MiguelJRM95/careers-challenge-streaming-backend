import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Agent, type Server } from "node:http";
import { HttpServer } from "../../src/adapters/in/http/core/http-server.ts";
import { EventIngestorService } from "../../src/domain/service/events/event-ingestor.service.ts";
import { EventDispatcher } from "../../src/domain/service/events/event-dispatcher.service.ts";
import { EventWorker } from "../../src/domain/service/events/event-worker.service.ts";
import { PriorityQueue } from "../../src/domain/models/priority-queue.ts";
import { AlarmService } from "../../src/domain/service/alarms/alarm.service.ts";
import { DeviceHealthService } from "../../src/domain/service/health/device-health.service.ts";
import { RoomOccupancyService } from "../../src/domain/service/occupancy/room-occupancy.service.ts";
import type { AlarmRepositoryPort } from "../../src/ports/out/alarm-repository.port.ts";
import type { HeartbeatRepositoryPort } from "../../src/ports/out/heartbeat-repository.port.ts";
import type { RoomOccupancyRepositoryPort } from "../../src/ports/out/room-occupancy-repository.port.ts";
import type { ValidatedEvent } from "../../src/domain/models/event.ts";

const fakeAlarmRepository: AlarmRepositoryPort = {
  insert: async () => true,
  findSince: async () => [],
};

const fakeHeartbeatRepository: HeartbeatRepositoryPort = {
  insert: async () => {},
  findHealth: async () => ({ latest: null, countSince: 0 }),
};

const fakeRoomOccupancyRepository: RoomOccupancyRepositoryPort = {
  insert: async () => {},
  findCurrentState: async () => null,
  findOccupiedSeconds: async () => 0,
};

const heartbeat = (i: number) => ({
  device_id: `dev_${i}`,
  room_id: "room_1",
  seq: i,
  ts: new Date().toISOString(),
  type: "heartbeat",
});

describe("ingest under burst", () => {
  let dispatcher: EventDispatcher;
  let worker: EventWorker;
  let server: Server;
  let agent: Agent;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const queue = new PriorityQueue<ValidatedEvent>();
    dispatcher = new EventDispatcher(queue);
    const alarmService = new AlarmService(fakeAlarmRepository);
    const deviceHealthService = new DeviceHealthService(fakeHeartbeatRepository);
    const roomOccupancyService = new RoomOccupancyService(fakeRoomOccupancyRepository);
    worker = new EventWorker(queue, alarmService, deviceHealthService, roomOccupancyService);
    worker.start();
    const httpServer = new HttpServer(
      0,
      new EventIngestorService(dispatcher),
      alarmService,
      deviceHealthService,
      roomOccupancyService,
    );
    server = httpServer.start();
    // Capped, reused connections: a real client pools connections rather
    // than opening 1000 simultaneous raw sockets, which would just trip the
    // OS accept backlog and produce ECONNREFUSED unrelated to our app.
    agent = new Agent({ keepAlive: true, maxSockets: 50 });
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    worker.stop();
    dispatcher.stop();
    agent.destroy();
    logSpy.mockRestore();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("keeps /health responsive while 1000 events are POSTed concurrently", async () => {
    // Fired but not yet awaited: superagent dispatches each request as soon
    // as it's built, so these 1000 POSTs are already in flight against the
    // shared server/dispatcher by the time we race /health below.
    const burst = Promise.all(
      Array.from({ length: 1000 }, (_, i) => request(server).post("/events").agent(agent).send(heartbeat(i))),
    );
    // Don't let an assertion failure below leave this unhandled if the
    // server gets closed mid-flight by afterEach.
    burst.catch(() => {});

    // Several pings spread across the burst's lifetime: each one rides its
    // own fresh socket (no shared agent), so a slow one means the event
    // loop is stuck processing ingestion, not connection-pool contention.
    const healthLatenciesMs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const healthRes = await request(server).get("/health");
      healthLatenciesMs.push(performance.now() - start);
      expect(healthRes.status).toBe(200);
    }

    // Generous bound: this guards against the event loop being stuck for
    // whole seconds processing the burst, not against network jitter.
    for (const ms of healthLatenciesMs) {
      expect(ms).toBeLessThan(1000);
    }

    const results = await burst;
    expect(results.every((r) => r.status === 202)).toBe(true);
  });
});

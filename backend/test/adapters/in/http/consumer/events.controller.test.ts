import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { HttpServer } from "../../../../../src/adapters/in/http/core/http-server.ts";
import { EventIngestorService } from "../../../../../src/domain/service/events/event-ingestor.service.ts";
import { EventDispatcher } from "../../../../../src/domain/service/events/event-dispatcher.service.ts";
import { EventWorker } from "../../../../../src/domain/service/events/event-worker.service.ts";
import { PriorityQueue } from "../../../../../src/domain/models/priority-queue.ts";
import type { ValidatedEvent } from "../../../../../src/domain/models/event.ts";

const NOW = new Date("2026-06-24T18:00:00.000Z");

const baseEnvelope = {
  device_id: "dev_0001",
  room_id: "room_14",
  seq: 1,
  ts: NOW.toISOString(),
};

// Lets queued events reach the worker's setImmediate continuation before assertions run.
const flushWorker = () => new Promise<void>((resolve) => setImmediate(() => setImmediate(resolve)));

describe("POST /events", () => {
  let server: HttpServer;
  let dispatcher: EventDispatcher;
  let worker: EventWorker;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const queue = new PriorityQueue<ValidatedEvent>();
    // flushThreshold: 1 so every admitted raw event is validated and enqueued immediately in tests.
    dispatcher = new EventDispatcher(queue, undefined, { flushThreshold: 1 });
    worker = new EventWorker(queue);
    worker.start();
    server = new HttpServer(0, new EventIngestorService(dispatcher));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    worker.stop();
    dispatcher.stop();
    vi.useRealTimers();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("returns 202 for a well-formed heartbeat and accepts it", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "heartbeat" });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "accepted" });
    await flushWorker();
    expect(logSpy).toHaveBeenCalledWith("event processed:", expect.objectContaining({ type: "heartbeat" }));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns 202 for a well-formed presence event and accepts it", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "presence", in_room: true });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(logSpy).toHaveBeenCalledWith("event processed:", expect.objectContaining({ type: "presence" }));
  });

  it("returns 202 for a well-formed motion event and accepts it", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "motion", magnitude: 0.81 });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(logSpy).toHaveBeenCalledWith("event processed:", expect.objectContaining({ type: "motion" }));
  });

  it("returns 202 for a well-formed sleep_state event and accepts it", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "sleep_state", state: "asleep" });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(logSpy).toHaveBeenCalledWith("event processed:", expect.objectContaining({ type: "sleep_state" }));
  });

  it("returns 202 for a well-formed fall_warn event and accepts it", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "fall_warn", confidence: 0.92 });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(logSpy).toHaveBeenCalledWith("event processed:", expect.objectContaining({ type: "fall_warn" }));
  });

  it("returns 202 for a well-formed net_status event and accepts it", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "net_status", rssi: -68 });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(logSpy).toHaveBeenCalledWith("event processed:", expect.objectContaining({ type: "net_status" }));
  });

  it("returns 202 but discards an event with ts more than 1 hour in the future", async () => {
    const future = new Date(NOW.getTime() + 60 * 60 * 1000 + 1).toISOString();
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "heartbeat", ts: future });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "accepted" });
    await flushWorker();
    expect(errorSpy).toHaveBeenCalledWith(
      "event discarded:",
      expect.objectContaining({ reason: "ts_in_future" }),
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("returns 202 but discards an event with ts more than 1 hour in the past", async () => {
    const past = new Date(NOW.getTime() - (60 * 60 * 1000 + 1)).toISOString();
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "heartbeat", ts: past });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(errorSpy).toHaveBeenCalledWith("event discarded:", expect.objectContaining({ reason: "ts_too_old" }));
  });

  it("returns 202 but discards an event missing required envelope fields", async () => {
    const { device_id, ...withoutDeviceId } = { ...baseEnvelope, type: "heartbeat" };
    const res = await request(server.app).post("/events").send(withoutDeviceId);

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "accepted" });
    await flushWorker();
    expect(errorSpy).toHaveBeenCalledWith("event discarded:", expect.objectContaining({ reason: "invalid_schema" }));
  });

  it("returns 202 but discards an event with an unknown type", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "unknown_type" });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(errorSpy).toHaveBeenCalledWith("event discarded:", expect.objectContaining({ reason: "invalid_schema" }));
  });

  it("returns 202 but discards an event with a malformed payload for its type", async () => {
    const res = await request(server.app)
      .post("/events")
      .send({ ...baseEnvelope, type: "motion", magnitude: 1.5 });

    expect(res.status).toBe(202);
    await flushWorker();
    expect(errorSpy).toHaveBeenCalledWith("event discarded:", expect.objectContaining({ reason: "invalid_schema" }));
  });
});

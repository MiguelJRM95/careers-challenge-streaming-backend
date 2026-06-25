import { afterEach, describe, expect, it } from "vitest";
import { EventDispatcher } from "../../../src/domain/service/event-dispatcher.service.ts";
import { PriorityQueue } from "../../../src/domain/models/priority-queue.ts";
import type { RawEvent, ValidatedEvent } from "../../../src/domain/models/event.ts";

// The dispatcher validates against Date.now() inside flush(), so fixtures
// must carry a ts close to "now" rather than a fixed date in the past.
const heartbeat = (seq: number): RawEvent => ({
  device_id: "dev_0001",
  room_id: "room_14",
  seq,
  ts: new Date().toISOString(),
  type: "heartbeat",
});

const fallWarn = (seq: number): RawEvent => ({
  device_id: "dev_0002",
  room_id: "room_14",
  seq,
  ts: new Date().toISOString(),
  type: "fall_warn",
  confidence: 0.92,
});

// fall_warn's immediate flush is scheduled via setImmediate; let it land.
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("EventDispatcher priority ordering", () => {
  let dispatcher: EventDispatcher;
  let queue: PriorityQueue<ValidatedEvent>;

  afterEach(() => {
    dispatcher.stop();
  });

  it("puts fall_warn ahead of other event types within the same flushed batch", async () => {
    queue = new PriorityQueue<ValidatedEvent>();
    // High threshold: heartbeat-1/2 and the fall_warn all land in one buffer,
    // flushed together only once the fall_warn triggers it.
    dispatcher = new EventDispatcher(queue, undefined, { flushThreshold: 100, flushIntervalMs: 999_999 });

    dispatcher.dispatch(heartbeat(1));
    dispatcher.dispatch(heartbeat(2));
    dispatcher.dispatch(fallWarn(1));
    await tick();

    expect(queue.size).toBe(3);
    expect(queue.dequeue()?.type).toBe("fall_warn");
    expect(queue.dequeue()?.type).toBe("heartbeat");
    expect(queue.dequeue()?.type).toBe("heartbeat");
  });

  it("lets a fall_warn jump ahead of heartbeats flushed in earlier, separate batches", async () => {
    queue = new PriorityQueue<ValidatedEvent>();
    // Threshold of 1: every dispatch flushes immediately as its own batch.
    dispatcher = new EventDispatcher(queue, undefined, { flushThreshold: 1, flushIntervalMs: 999_999 });

    dispatcher.dispatch(heartbeat(1));
    await tick();
    dispatcher.dispatch(heartbeat(2));
    await tick();
    expect(queue.size).toBe(2);

    dispatcher.dispatch(fallWarn(1));
    await tick();

    expect(queue.size).toBe(3);
    // The fall_warn must not be stuck behind the two already-queued heartbeats.
    expect(queue.dequeue()?.type).toBe("fall_warn");
    expect(queue.dequeue()?.type).toBe("heartbeat");
    expect(queue.dequeue()?.type).toBe("heartbeat");
  });

  it("does not wait for the size threshold or timer when a fall_warn arrives", async () => {
    queue = new PriorityQueue<ValidatedEvent>();
    dispatcher = new EventDispatcher(queue, undefined, { flushThreshold: 1000, flushIntervalMs: 999_999 });

    dispatcher.dispatch(fallWarn(1));
    expect(queue.isEmpty()).toBe(true); // flush is scheduled, not synchronous

    await tick();

    expect(queue.size).toBe(1);
    expect(queue.dequeue()?.type).toBe("fall_warn");
  });
});

import { describe, expect, it } from "vitest";
import { PriorityQueue } from "../../../src/domain/models/priority-queue.ts";

describe("PriorityQueue", () => {
  it("dequeues lower priority numbers first regardless of insertion order", () => {
    const queue = new PriorityQueue<string>();

    queue.enqueue(3, "motion");
    queue.enqueue(2, "heartbeat");
    queue.enqueue(0, "fall_warn");
    queue.enqueue(1, "presence");

    expect(queue.dequeue()).toBe("fall_warn");
    expect(queue.dequeue()).toBe("presence");
    expect(queue.dequeue()).toBe("heartbeat");
    expect(queue.dequeue()).toBe("motion");
  });

  it("preserves FIFO order among items of equal priority", () => {
    const queue = new PriorityQueue<string>();

    queue.enqueue(2, "heartbeat-1");
    queue.enqueue(2, "heartbeat-2");
    queue.enqueue(2, "heartbeat-3");

    expect(queue.dequeue()).toBe("heartbeat-1");
    expect(queue.dequeue()).toBe("heartbeat-2");
    expect(queue.dequeue()).toBe("heartbeat-3");
  });

  it("lets a high-priority item jump ahead of already-queued lower-priority items", () => {
    const queue = new PriorityQueue<string>();

    // A batch of heartbeats lands first, as if flushed before any alarm arrived.
    queue.enqueue(2, "heartbeat-1");
    queue.enqueue(2, "heartbeat-2");
    queue.enqueue(2, "heartbeat-3");

    // A fall_warn enqueued afterwards must not get stuck behind them.
    queue.enqueue(0, "fall_warn");

    expect(queue.dequeue()).toBe("fall_warn");
    expect(queue.dequeue()).toBe("heartbeat-1");
  });

  it("reports size and emptiness correctly", () => {
    const queue = new PriorityQueue<number>();

    expect(queue.isEmpty()).toBe(true);
    expect(queue.size).toBe(0);

    queue.enqueue(1, 42);
    expect(queue.isEmpty()).toBe(false);
    expect(queue.size).toBe(1);

    queue.dequeue();
    expect(queue.isEmpty()).toBe(true);
  });

  it("returns undefined when dequeuing an empty queue", () => {
    const queue = new PriorityQueue<number>();
    expect(queue.dequeue()).toBeUndefined();
  });
});

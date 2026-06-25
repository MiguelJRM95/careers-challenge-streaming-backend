import type { EventType, RawEvent, ValidatedEvent } from "../models/event.js";
import { PriorityQueue } from "../models/priority-queue.js";
import { EventValidator } from "./event-validator.service.js";

const PRIORITIES: Record<EventType, number> = {
  fall_warn: 0,
  presence: 1,
  heartbeat: 2,
  motion: 3,
  sleep_state: 3,
  net_status: 3,
};

export interface EventDispatcherOptions {
  flushThreshold?: number;
  flushIntervalMs?: number;
}

function isFallWarnRaw(raw: RawEvent): boolean {
  return typeof raw === "object" && raw !== null && (raw as Record<string, unknown>).type === "fall_warn";
}

/**
 * Decouples event admission from validation/processing. `dispatch()` is
 * called synchronously from the HTTP handler and only does an O(1) push
 * onto an in-memory buffer of *raw, unvalidated* events — the zod parsing
 * (and everything downstream of it) happens later in `flush()`, which only
 * ever runs from a timer or a `setImmediate` continuation, never on the
 * request's call stack. That's what keeps a burst of POSTs from piling up
 * synchronous validation work on the event loop tick that's also serving
 * other routes (e.g. the alarms feed).
 *
 * `fall_warn` skips the threshold/timer wait by scheduling its flush via
 * `setImmediate` as soon as it's admitted, bounding the alarm feed's
 * ingest-to-persist latency independently of how full the buffer is.
 */
export class EventDispatcher {
  private buffer: RawEvent[] = [];
  private readonly flushThreshold: number;
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly queue: PriorityQueue<ValidatedEvent>,
    private readonly validator: EventValidator = new EventValidator(),
    options: EventDispatcherOptions = {},
  ) {
    this.flushThreshold = options.flushThreshold ?? 500;
    this.timer = setInterval(() => this.flush(), options.flushIntervalMs ?? 100);
  }

  dispatch(raw: RawEvent): void {
    this.buffer.push(raw);

    if (isFallWarnRaw(raw) || this.buffer.length >= this.flushThreshold) {
      setImmediate(() => this.flush());
    }
  }

  get bufferSize(): number {
    return this.buffer.length;
  }

  stop(): void {
    clearInterval(this.timer);
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    // Atomic w.r.t. dispatch(): splice empties the buffer in one step so
    // concurrent pushes from in-flight requests land in the next batch.
    const batch = this.buffer.splice(0);
    const fallWarns: ValidatedEvent[] = [];
    const rest: ValidatedEvent[] = [];

    for (const raw of batch) {
      const result = this.validator.validate(raw);
      if (!result.ok) {
        console.error("event discarded:", { reason: result.reason, detail: result.detail, event: raw });
        continue;
      }
      (result.event.type === "fall_warn" ? fallWarns : rest).push(result.event);
    }

    for (const event of [...fallWarns, ...rest]) {
      this.queue.enqueue(PRIORITIES[event.type], event);
    }
  }
}

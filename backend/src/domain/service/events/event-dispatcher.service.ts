import { logger } from "../../../config/logger.ts";
import { bufferFillRatio, eventsIngestedTotal, eventsRejectedTotal } from "../../../config/metrics.ts";
import type { EventType, RawEvent, ValidatedEvent } from "../../models/event.ts";
import { PriorityQueue } from "../../models/priority-queue.ts";
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
    this.reportBufferLevel();

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

  private reportBufferLevel(): void {
    bufferFillRatio.set(this.buffer.length / this.flushThreshold);
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    // Atomic w.r.t. dispatch(): splice empties the buffer in one step so
    // concurrent pushes from in-flight requests land in the next batch.
    const batch = this.buffer.splice(0);
    this.reportBufferLevel();
    const fallWarns: ValidatedEvent[] = [];
    const rest: ValidatedEvent[] = [];

    for (const raw of batch) {
      const result = this.validator.validate(raw);
      if (!result.ok) {
        logger.warn("event discarded", { reason: result.reason, detail: result.detail, event: raw });
        eventsRejectedTotal.inc({ reason: result.reason });
        continue;
      }
      eventsIngestedTotal.inc({ type: result.event.type });
      (result.event.type === "fall_warn" ? fallWarns : rest).push(result.event);
    }

    for (const event of [...fallWarns, ...rest]) {
      this.queue.enqueue(PRIORITIES[event.type], event);
    }
  }
}

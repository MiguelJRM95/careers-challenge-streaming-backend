import type { ValidatedEvent } from "../../models/event.ts";
import type { PriorityQueue } from "../../models/priority-queue.ts";
import type { AlarmService } from "../alarms/alarm.service.ts";

/**
 * Drains the priority queue on its own continuation chain, yielding to the
 * event loop via setImmediate between items. Processing therefore never
 * sits on the call stack of an HTTP handler: incoming POSTs to /events and
 * reads on other routes (e.g. the alarms feed) get serviced in between
 * worker iterations instead of queuing up behind a synchronous drain loop.
 */
export class EventWorker {
  private running = false;

  constructor(
    private readonly queue: PriorityQueue<ValidatedEvent>,
    private readonly alarmService: AlarmService,
  ) {}

  start(): void {
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop(): void {
    if (!this.running) return;

    const event = this.queue.dequeue();
    if (event) {
      // Not awaited: process() will become I/O-bound (PG writes) once
      // RF-1/2/3 land, and a slow write must not stall the dequeue of the
      // next event. Errors are caught here so a rejected write can't crash
      // the loop either.
      this.process(event).catch((err: unknown) => console.error("worker processing error:", { err, event }));
    }

    setImmediate(() => this.loop());
  }

  // TODO: route heartbeat/presence to the RF-1/RF-2 use cases
  // (DeviceHealthManager, RoomOccupancyManager) once they land.
  private async process(event: ValidatedEvent): Promise<void> {
    if (event.type === "fall_warn") {
      await this.alarmService.onFallWarn(event);
      return;
    }
  }
}

import { logger } from "../../../config/logger.ts";
import { eventsProcessingErrorsTotal, queueDepth } from "../../../config/metrics.ts";
import type { ValidatedEvent } from "../../models/event.ts";
import type { PriorityQueue } from "../../models/priority-queue.ts";
import type { AlarmService } from "../alarms/alarm.service.ts";
import type { DeviceHealthService } from "../health/device-health.service.ts";

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
    private readonly deviceHealthService: DeviceHealthService,
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
    // Reported every tick (not just on dequeue) so the gauge reads 0 once
    // the backlog drains, instead of holding the last nonzero value -
    // CONTEXT.md's "tamaño de cola" observability requirement, and the
    // earliest signal that a burst is outpacing processing.
    queueDepth.set(this.queue.size);

    if (event) {
      // Not awaited: process() will become I/O-bound (PG writes) once
      // RF-1/2 land, and a slow write must not stall the dequeue of the
      // next event. Errors are caught here so a rejected write can't crash
      // the loop either - this is the one place a validated event can still
      // be lost (e.g. a DB write failure), so it's logged at error severity
      // with the full event and counted, per CONTEXT.md's "no silent drop".
      this.process(event).catch((err: unknown) => {
        logger.error("worker processing error", { err, event });
        eventsProcessingErrorsTotal.inc({ type: event.type });
      });
    }

    setImmediate(() => this.loop());
  }

  // TODO: route presence to the RF-2 use case (RoomOccupancyManager) once it lands.
  private async process(event: ValidatedEvent): Promise<void> {
    if (event.type === "fall_warn") {
      await this.alarmService.onFallWarn(event);
      return;
    }
    if (event.type === "heartbeat") {
      await this.deviceHealthService.onHeartbeat(event);
      return;
    }
  }
}

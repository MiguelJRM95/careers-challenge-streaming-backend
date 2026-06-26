import { logger } from "../../../config/logger.ts";
import { alarmsEmittedTotal, fallWarnDuplicatesTotal } from "../../../config/metrics.ts";
import type { Alarm } from "../../models/alarm.ts";
import type { ValidatedEvent } from "../../models/event.ts";
import type { AlarmsPort } from "../../../ports/in/alarm-feed.port.ts";
import type { AlarmRepositoryPort } from "../../../ports/out/alarm-repository.port.ts";

type FallWarnEvent = Extract<ValidatedEvent, { type: "fall_warn" }>;

export class AlarmService implements AlarmsPort {
  constructor(private readonly repository: AlarmRepositoryPort) {}

  async onFallWarn(event: FallWarnEvent): Promise<void> {
    const alarm: Alarm = {
      device_id: event.device_id,
      room_id: event.room_id,
      ts: event.ts,
      confidence: event.confidence,
    };
    const isNew = await this.repository.insert(alarm);

    if (isNew) {
      alarmsEmittedTotal.inc();
      logger.info("alarm emitted", { device_id: alarm.device_id, room_id: alarm.room_id, ts: alarm.ts });
    } else {
      fallWarnDuplicatesTotal.inc();
      logger.info("fall_warn deduplicated", { device_id: alarm.device_id, ts: alarm.ts });
    }
  }

  async feed(since: string): Promise<Alarm[]> {
    const sinceDate = since === "0" ? new Date(0) : new Date(since);
    return this.repository.findSince(sinceDate);
  }
}

import type { Alarm } from "../../models/alarm.ts";
import type { ValidatedEvent } from "../../models/event.ts";
import type { AlarmsPort } from "../../../ports/in/alarm-feed.port.ts";
import type { AlarmRepositoryPort } from "../../../ports/out/alarm-repository.port.ts";

type FallWarnEvent = Extract<ValidatedEvent, { type: "fall_warn" }>;

/**
 * RF-3/RF-4: deduplicates fall_warn events and serves the alarm feed.
 * Dedup correctness lives entirely in the repository's atomic insert (a
 * Postgres exclusion constraint over a sliding [ts-2.5s, ts+2.5s] window per
 * device) — this service just maps the event and reports whether the fall
 * was new.
 */
export class AlarmService implements AlarmsPort {
  constructor(private readonly repository: AlarmRepositoryPort) {}

  async onFallWarn(event: FallWarnEvent): Promise<void> {
    const alarm: Alarm = {
      device_id: event.device_id,
      room_id: event.room_id,
      ts: event.ts,
      confidence: event.confidence,
    };
    await this.repository.insert(alarm);
  }

  async feed(since: string): Promise<Alarm[]> {
    const sinceDate = since === "0" ? new Date(0) : new Date(since);
    return this.repository.findSince(sinceDate);
  }
}

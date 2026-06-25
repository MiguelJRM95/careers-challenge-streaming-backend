import type { Alarm } from "../../domain/models/alarm.ts";

/**
 * Inbound port: how the alarm feed is read regardless of transport.
 * `since` is either the literal "0" (all alarms since the beginning, used
 * by the scorer to validate the total) or an ISO timestamp.
 */
export interface AlarmsPort {
  feed(since: string): Promise<Alarm[]>;
}

import type { Alarm } from "../../domain/models/alarm.ts";


export interface AlarmsPort {
  feed(since: string): Promise<Alarm[]>;
}

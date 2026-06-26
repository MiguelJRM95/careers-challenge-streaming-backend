import type { Alarm } from "../../domain/models/alarm.ts";

export interface AlarmRepositoryPort {
   
  insert(alarm: Alarm): Promise<boolean>;

  findSince(since: Date): Promise<Alarm[]>;
}

import type { RawEvent } from "../../domain/models/event.ts";

export interface ReceiveEventPort {
  receive(event: RawEvent): void;
}

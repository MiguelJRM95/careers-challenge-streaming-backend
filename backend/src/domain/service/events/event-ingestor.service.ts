import type { ReceiveEventPort } from "../../../ports/in/receive-event.port.ts";
import type { RawEvent } from "../../models/event.ts";
import type { EventDispatcher } from "./event-dispatcher.service.ts";

export class EventIngestorService implements ReceiveEventPort {
  constructor(private readonly dispatcher: EventDispatcher) {}

  receive(raw: RawEvent): void {
    this.dispatcher.dispatch(raw);
  }
}

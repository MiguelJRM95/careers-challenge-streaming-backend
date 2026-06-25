import type { ReceiveEventPort } from "../../../ports/in/receive-event.port.ts";
import type { RawEvent } from "../../models/event.ts";
import type { EventDispatcher } from "./event-dispatcher.service.ts";

/**
 * Inbound entry point: hands the raw event straight to the EventDispatcher,
 * which only buffers it. Validation happens later in the dispatcher's
 * flush, off the request's call stack, so a burst of POSTs never pays for
 * zod parsing synchronously here.
 */
export class EventIngestorService implements ReceiveEventPort {
  constructor(private readonly dispatcher: EventDispatcher) {}

  receive(raw: RawEvent): void {
    this.dispatcher.dispatch(raw);
  }
}

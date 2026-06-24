import type { ReceiveEventPort } from "../../ports/in/receive-event.port.ts";
import type { RawEvent } from "../models/event.ts";
import { EventValidator } from "./event-validator.service.ts";

/**
 * Validates incoming events against the checklist (envelope/type/payload via
 * zod, then ts clock-skew bounds). Every POST is accepted at the transport
 * boundary; an invalid event is logged with its full payload and discarded
 * here rather than rejected, so admission never depends on event quality.
 */
export class IngestEventService implements ReceiveEventPort {
  constructor(private readonly validator: EventValidator = new EventValidator()) {}

  receive(raw: RawEvent): void {
    const result = this.validator.validate(raw);

    if (!result.ok) {
      console.error("event discarded:", { reason: result.reason, detail: result.detail, event: raw });
      return;
    }

    console.log("event accepted:", result.event);
  }
}

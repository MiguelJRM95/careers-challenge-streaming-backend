import type { ReceiveEventPort } from "../../ports/in/receive-event.port.js";
import type { RawEvent } from "../models/event.js";

/**
 * Placeholder core: just accepts whatever arrives over the transport.
 * Envelope validation, ts bounds, buffering, etc. are separate checklist
 * items and will replace this body without touching the port contract.
 */
export class IngestEventService implements ReceiveEventPort {
  receive(event: RawEvent): void {
    console.log("event received:", event);
  }
}

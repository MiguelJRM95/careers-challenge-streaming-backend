import type { RawEvent } from "../../domain/models/event.ts";

/**
 * Inbound port: how the domain accepts an event regardless of transport.
 * Ingestion never rejects at the transport boundary; invalid events are
 * logged and discarded internally (see EventIngestorService).
 */
export interface ReceiveEventPort {
  receive(event: RawEvent): void;
}

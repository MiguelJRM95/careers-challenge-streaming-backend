import type { RawEvent } from "../../domain/models/event.js";

/**
 * Inbound port: how the domain accepts an event regardless of transport.
 * The HTTP adapter is the first implementation of a caller; future
 * transports (gRPC, MQTT, WebSocket) would call the same port.
 */
export interface ReceiveEventPort {
  receive(event: RawEvent): void;
}

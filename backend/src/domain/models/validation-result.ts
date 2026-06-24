import type { ValidatedEvent } from "./event.js";

/**
 * Why an event was discarded at ingest. Maps to CONTEXT.md's ingestion
 * checklist (envelope/type/payload shape via zod, then ts clock-skew bounds).
 */
export type RejectionReason = "invalid_schema" | "ts_in_future" | "ts_too_old";

export type ValidationResult =
  | { ok: true; event: ValidatedEvent }
  | { ok: false; reason: RejectionReason; detail: string };

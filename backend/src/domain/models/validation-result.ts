import type { ValidatedEvent } from "./event.js";


// Validator to fail fast on invalid events, and to provide a reason for rejection.
export type RejectionReason = "invalid_schema" | "ts_in_future" | "ts_too_old";

export type ValidationResult =
  | { ok: true; event: ValidatedEvent }
  | { ok: false; reason: RejectionReason; detail: string };

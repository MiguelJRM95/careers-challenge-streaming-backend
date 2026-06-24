import { eventSchema, type RawEvent } from "../models/event.js";
import type { ValidationResult } from "../models/validation-result.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Pure domain rule: validates the common envelope + per-type payload via the
 * zod schema, then the ts clock-skew bounds. No I/O, no side effects.
 */
export class EventValidator {
  validate(raw: RawEvent, now: number = Date.now()): ValidationResult {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, reason: "invalid_schema", detail: parsed.error.message };
    }

    const tsMs = Date.parse(parsed.data.ts);
    if (tsMs > now + ONE_HOUR_MS) {
      return { ok: false, reason: "ts_in_future", detail: "ts is more than 1 hour in the future" };
    }
    if (tsMs < now - ONE_HOUR_MS) {
      return { ok: false, reason: "ts_too_old", detail: "ts is more than 1 hour in the past" };
    }

    return { ok: true, event: parsed.data };
  }
}

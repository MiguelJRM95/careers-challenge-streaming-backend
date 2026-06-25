import { describe, expect, it } from "vitest";
import { EventValidator } from "../../../src/domain/service/events/event-validator.service.ts";
import type { RawEvent } from "../../../src/domain/models/event.ts";
import type { RejectionReason, ValidationResult } from "../../../src/domain/models/validation-result.ts";

const NOW = new Date("2026-06-24T18:00:00.000Z").getTime();

function isoOffsetFromNow(deltaMs: number): string {
  return new Date(NOW + deltaMs).toISOString();
}

const baseEnvelope = {
  device_id: "dev_0001",
  room_id: "room_14",
  seq: 1,
  ts: isoOffsetFromNow(0),
};

function expectRejected(result: ValidationResult, reason: RejectionReason): void {
  if (result.ok) throw new Error("expected the event to be rejected, but it was accepted");
  expect(result.reason).toBe(reason);
}

describe("EventValidator", () => {
  const validator = new EventValidator();

  function validate(raw: RawEvent): ValidationResult {
    return validator.validate(raw, NOW);
  }

  it("accepts a well-formed heartbeat", () => {
    const result = validate({ ...baseEnvelope, type: "heartbeat" });
    expect(result).toEqual({ ok: true, event: { ...baseEnvelope, type: "heartbeat" } });
  });

  it("accepts a well-formed presence event", () => {
    const result = validate({ ...baseEnvelope, type: "presence", in_room: true });
    expect(result).toEqual({ ok: true, event: { ...baseEnvelope, type: "presence", in_room: true } });
  });

  it("accepts a well-formed motion event", () => {
    const result = validate({ ...baseEnvelope, type: "motion", magnitude: 0.81 });
    expect(result).toEqual({ ok: true, event: { ...baseEnvelope, type: "motion", magnitude: 0.81 } });
  });

  it("accepts a well-formed sleep_state event", () => {
    const result = validate({ ...baseEnvelope, type: "sleep_state", state: "asleep" });
    expect(result).toEqual({ ok: true, event: { ...baseEnvelope, type: "sleep_state", state: "asleep" } });
  });

  it("accepts a well-formed fall_warn event", () => {
    const result = validate({ ...baseEnvelope, type: "fall_warn", confidence: 0.92 });
    expect(result).toEqual({ ok: true, event: { ...baseEnvelope, type: "fall_warn", confidence: 0.92 } });
  });

  it("accepts a well-formed net_status event", () => {
    const result = validate({ ...baseEnvelope, type: "net_status", rssi: -68 });
    expect(result).toEqual({ ok: true, event: { ...baseEnvelope, type: "net_status", rssi: -68 } });
  });

  it("accepts ts exactly 1 hour in the past", () => {
    const result = validate({ ...baseEnvelope, type: "heartbeat", ts: isoOffsetFromNow(-60 * 60 * 1000) });
    expect(result.ok).toBe(true);
  });

  it("accepts ts exactly 1 hour in the future", () => {
    const result = validate({ ...baseEnvelope, type: "heartbeat", ts: isoOffsetFromNow(60 * 60 * 1000) });
    expect(result.ok).toBe(true);
  });

  it("rejects ts more than 1 hour in the future as ts_in_future", () => {
    const result = validate({ ...baseEnvelope, type: "heartbeat", ts: isoOffsetFromNow(60 * 60 * 1000 + 1) });
    expectRejected(result, "ts_in_future");
  });

  it("rejects ts more than 1 hour in the past as ts_too_old", () => {
    const result = validate({ ...baseEnvelope, type: "heartbeat", ts: isoOffsetFromNow(-(60 * 60 * 1000 + 1)) });
    expectRejected(result, "ts_too_old");
  });

  it("rejects a missing device_id as invalid_schema", () => {
    const { device_id, ...withoutDeviceId } = { ...baseEnvelope, type: "heartbeat" };
    expectRejected(validate(withoutDeviceId), "invalid_schema");
  });

  it("rejects a missing room_id as invalid_schema", () => {
    const { room_id, ...withoutRoomId } = { ...baseEnvelope, type: "heartbeat" };
    expectRejected(validate(withoutRoomId), "invalid_schema");
  });

  it("rejects a non-integer seq as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "heartbeat", seq: 1.5 }), "invalid_schema");
  });

  it("rejects a malformed ts as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "heartbeat", ts: "not-a-date" }), "invalid_schema");
  });

  it("rejects an unknown event type as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "unknown_type" }), "invalid_schema");
  });

  it("rejects motion with magnitude out of [0,1] as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "motion", magnitude: 1.5 }), "invalid_schema");
  });

  it("rejects fall_warn with confidence out of [0,1] as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "fall_warn", confidence: -0.1 }), "invalid_schema");
  });

  it("rejects sleep_state with an invalid state as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "sleep_state", state: "dreaming" }), "invalid_schema");
  });

  it("rejects presence with a non-boolean in_room as invalid_schema", () => {
    expectRejected(validate({ ...baseEnvelope, type: "presence", in_room: "yes" }), "invalid_schema");
  });

  it("rejects a non-object payload as invalid_schema", () => {
    expectRejected(validate("not-an-object"), "invalid_schema");
  });

  it("rejects null as invalid_schema", () => {
    expectRejected(validate(null), "invalid_schema");
  });
});

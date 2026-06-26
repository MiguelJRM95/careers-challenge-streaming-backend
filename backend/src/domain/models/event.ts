import { z } from "zod";

export const EVENT_TYPES = [
  "heartbeat",
  "presence",
  "motion",
  "sleep_state",
  "fall_warn",
  "net_status",
] as const;

const envelope = {
  device_id: z.string().min(1),
  room_id: z.string().min(1),
  ts: z.iso.datetime({ offset: true }),
  seq: z.number().int(),
};

const heartbeatEventSchema = z.object({ ...envelope, type: z.literal("heartbeat") });
const presenceEventSchema = z.object({ ...envelope, type: z.literal("presence"), in_room: z.boolean() });
const motionEventSchema = z.object({ ...envelope, type: z.literal("motion"), magnitude: z.number().min(0).max(1) });
const sleepStateEventSchema = z.object({
  ...envelope,
  type: z.literal("sleep_state"),
  state: z.enum(["asleep", "awake", "unknown"]),
});
const fallWarnEventSchema = z.object({
  ...envelope,
  type: z.literal("fall_warn"),
  confidence: z.number().min(0).max(1),
});
const netStatusEventSchema = z.object({ ...envelope, type: z.literal("net_status"), rssi: z.number() });

// Simulated and avro schema. This allows us to
// validate the "message"
export const eventSchema = z.discriminatedUnion("type", [
  heartbeatEventSchema,
  presenceEventSchema,
  motionEventSchema,
  sleepStateEventSchema,
  fallWarnEventSchema,
  netStatusEventSchema,
]);


export type RawEvent = unknown;

export type EventType = (typeof EVENT_TYPES)[number];

export type ValidatedEvent = z.infer<typeof eventSchema>;

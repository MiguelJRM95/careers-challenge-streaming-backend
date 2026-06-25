import { Counter, Gauge, Registry, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const eventsIngestedTotal = new Counter({
  name: "events_ingested_total",
  help: "Total number of events accepted for ingestion",
  labelNames: ["type"],
  registers: [registry],
});

export const eventsRejectedTotal = new Counter({
  name: "events_rejected_total",
  help: "Total number of events rejected during validation",
  labelNames: ["reason"],
  registers: [registry],
});

export const alarmsEmittedTotal = new Counter({
  name: "alarms_emitted_total",
  help: "Total number of fall_warn alarms emitted",
  registers: [registry],
});

export const queueDepth = new Gauge({
  name: "queue_depth",
  help: "Current number of events waiting in the priority queue",
  registers: [registry],
});

export const bufferFillRatio = new Gauge({
  name: "buffer_fill_ratio",
  help: "Event buffer depth divided by the flush threshold (0-1)",
  registers: [registry],
});

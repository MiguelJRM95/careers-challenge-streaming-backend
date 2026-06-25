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

export const eventsProcessingErrorsTotal = new Counter({
  name: "events_processing_errors_total",
  help: "Total number of events that failed during worker processing (e.g. a failed DB write)",
  labelNames: ["type"],
  registers: [registry],
});

export const fallWarnDuplicatesTotal = new Counter({
  name: "fall_warn_duplicates_total",
  help: "Total number of fall_warn events recognized as duplicates of an existing alarm within the dedup window",
  registers: [registry],
});

export const resourceNotFoundTotal = new Counter({
  name: "resource_not_found_total",
  help: "Total number of read requests for a device or room with no recorded state yet (404s)",
  labelNames: ["resource"],
  registers: [registry],
});

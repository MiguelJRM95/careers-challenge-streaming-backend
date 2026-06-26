# Submission, Real-time Streaming Backend

**Your name:** Miguel José Rodríguez Martínez  
**Email:** miguelj.rodriguezmartinez@gmail.com  
**Link to your fork or solution:** [Develop branch](https://github.com/MiguelJRM95/careers-challenge-streaming-backend/tree/develop)   
**LinkedIn:** https://www.linkedin.com/in/migueljrm-backend-software-engineer/    

---
## Assumptions

- For fall_warn deduplication I chose a 2.5s sliding window and assumed the device sends the same confidence (rounded to two decimals) for jittered copies of the same fall.  
- I stuck to HTTP and the evaluator script for simplicity.  
- Single instance.  
- No auth.  
- DB will not go down.  
- Every room_id/device_id is assumed valid (no allowlist).  

## Stack and storage

- TypeScript
- Express
- PostgreSQL
- Vitest

Since Teton's main development language is TypeScript, I stuck to it, though my main language is Java.
PostgreSQL as the single source of truth: ACID inserts mean dedup, late-event ordering, and restart recovery all fall out of the schema/constraints instead of needing extra in-memory logic or caching to get right.

## Ordering and late events

I use each event's `ts` as the ordering reference, not arrival time, partitioned by device_id/room_id.  
Insert ordering is enforced at the database level, which is the source of truth (see the db scripts inside the backend folder), keyed by `ts` and device_id/room_id.  
For fall_warn deduplication, the constraint key is device_id + confidence + a 2.5s sliding window, enforced atomically at the database level.

## Backpressure

Since I kept the HTTP contract from the eval script, I used a buffer with a threshold (size and time) and let fall_warns bypass it to trigger an immediate flush, so bursts don't affect the rest of the system. This means ingestion of other event types slows down during a burst, while fall_warn latency stays low and no events are rejected.
For the alarm feed itself I chose plain polling (`GET /alarms?since=`) over SSE/WebSocket: no connection state to keep alive or recover after a restart, and the `since` path param already gives resumability.

## Restart correctness

Since I chose the database as the source of truth (the simplest way to recover state after a restart), every event is inserted in order, which guarantees correctness of the whole pipeline.

## How to run it locally

If you don't have it locally. Clone the develop branch:
```bash
 git clone -b develop https://github.com/MiguelJRM95/careers-challenge-streaming-backend.git
```
I modified the Makefile to make sure the service starts and is ready before the evaluator runs, then stops the instance afterward.
If you want to run it locally, I added a docker-compose file — just run:
```bash
docker-compose up
```
Or
```bash
docker compose build --no-cache && docker-compose up
```
And you'll have my solution running on port 3000.
If you don't want to run it with Docker, you can use pnpm:
```bash
pnpm dev
```

## Reported metrics

All exposed at `/metrics` (Prometheus format, `backend/src/config/metrics.ts`):

- Sustained ingest rate: `rate(events_ingested_total{type=...}[1m])`.
- Alarm feed latency p50 / p95: GET /alarms response time.  
  `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{route="/alarms"}[1m]))`   
  `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{route="/alarms"}[1m]))` 
- Behavior under hard kill + restart: `queue_depth` and `buffer_fill_ratio` drop to 0 right before the kill; `events_processing_errors_total` stays flat across the restart, confirming nothing already persisted to Postgres was lost.
- Aggregation correctness on replayed events: not a Prometheus metric — validated against the generator's ground truth via `eval/check.py` (distinct_falls vs. alarms returned).  
```bash
    python3 eval/check.py burst --target http://localhost:3000 --devices 50
    Running scenario 'burst' (burst) against http://localhost:3000
    Sending events to http://localhost:3000/events for 180s (50 devices × 1.0/sec each)

    Ground truth:
        total events sent:    13563 (incl. fall jitter)
        distinct falls:       182 (dedup target)
        HTTP sent ok:         13563
        HTTP failed:          0
    {"ground_truth": {"total": 13563, "distinct_falls": 182, "sent_ok": 13563, "failed": 0}}

    Waiting 3s for in-flight late events to settle…

        === Scorecard: burst ===
    events generated      13563 (incl. fall jitter)
    HTTP ingested ok      13563
    HTTP failed           0
    distinct falls (gt)   182
    alarms returned       182
    ✓ alarm count matches distinct falls
    /rooms/room_000/occupancy?window=1m: {'room_id': 'room_000', 'in_room': True, 'window': '1m', 'occupancy_pct': 41.53}
    /devices/dev_0000/health: {'device_id': 'dev_0000', 'latest_heartbeat': '2026-06-26T18:28:32.906Z', 'availability_5m': 53.33}
```  
- `buffer_fill_ratio` and `queue_depth` also double as alerting signals — a rule on `buffer_fill_ratio` approaching 1 would notify before the admission buffer is actually exhausted.

## With another week

- Use Kafka/SQS/Kinesis for event ingestion. Reasons:
  1. IoT devices typically speak MQTT; a bridge (HiveMQ/Mosquitto) would forward to Kafka for streaming.  
  2. Partitioning by device_id gives ordered, replayable per-device streams without an in-memory priority queue that doesn't survive a restart.  
  3. Consumer offsets give resumable delivery out of the box.  
  4. Decouples ingestion rate from processing rate via consumer lag, instead of an in-memory buffer with a fixed flush threshold.  

- Implement a graceful shutdown to avoid losing unprocessed events.  
- Implement a buffer state snapshot to recover from service restarts using the DB or memcache/Redis.  
- Implement an SSE endpoint for the alarm feed with a resumable cursor based on `ts`, or an event id if two fall_warns from different devices share the same `ts`.  
- Real health endpoint checking database readiness.  
- Index for (room_id, ts) to avoid performance issues with a large number of items in database.  

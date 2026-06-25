import type { DeviceHealth } from "../../models/device-health.ts";
import type { ValidatedEvent } from "../../models/event.ts";
import type { DeviceHealthPort } from "../../../ports/in/device-health.port.ts";
import type { HeartbeatRepositoryPort } from "../../../ports/out/heartbeat-repository.port.ts";

type HeartbeatEvent = Extract<ValidatedEvent, { type: "heartbeat" }>;

const AVAILABILITY_WINDOW_MS = 5 * 60 * 1000;
const EXPECTED_HEARTBEATS_5M = 300; // ~1Hz over 5 minutes

/**
 * RF-1: per-device health. Heartbeats are inserted with their own `ts`, and
 * `getHealth` recomputes `latest_heartbeat`/`availability_5m` straight from
 * stored rows on every read instead of tracking either incrementally — a
 * late-arriving heartbeat needs no special-case fixup, it just lands in the
 * same query the next time someone reads this device's health.
 */
export class DeviceHealthService implements DeviceHealthPort {
  constructor(private readonly repository: HeartbeatRepositoryPort) {}

  async onHeartbeat(event: HeartbeatEvent): Promise<void> {
    await this.repository.insert(event.device_id, event.room_id, event.ts);
  }

  async getHealth(deviceId: string): Promise<DeviceHealth | null> {
    const since = new Date(Date.now() - AVAILABILITY_WINDOW_MS);
    const { latest, countSince } = await this.repository.findHealth(deviceId, since);
    if (latest === null) return null;

    // Capped at 100: a device replaying buffered heartbeats on reconnect can
    // momentarily exceed the ~1Hz expectation within the window. Rounded to
    // 2 decimals since this is a percentage for human/scorer consumption,
    // not an intermediate value for further computation.
    const availability = Math.min(100, (countSince / EXPECTED_HEARTBEATS_5M) * 100);

    return {
      device_id: deviceId,
      latest_heartbeat: latest.toISOString(),
      availability_5m: Math.round(availability * 100) / 100,
    };
  }
}

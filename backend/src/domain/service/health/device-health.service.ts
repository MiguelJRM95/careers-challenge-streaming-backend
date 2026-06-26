import type { DeviceHealth } from "../../models/device-health.ts";
import type { ValidatedEvent } from "../../models/event.ts";
import type { DeviceHealthPort } from "../../../ports/in/device-health.port.ts";
import type { HeartbeatRepositoryPort } from "../../../ports/out/heartbeat-repository.port.ts";

type HeartbeatEvent = Extract<ValidatedEvent, { type: "heartbeat" }>;

const AVAILABILITY_WINDOW_MS = 5 * 60 * 1000;
const EXPECTED_HEARTBEATS_5M = 300; // ~1Hz over 5 minutes

export class DeviceHealthService implements DeviceHealthPort {
  constructor(private readonly repository: HeartbeatRepositoryPort) {}

  async onHeartbeat(event: HeartbeatEvent): Promise<void> {
    await this.repository.insert(event.device_id, event.room_id, event.ts);
  }

  async getHealth(deviceId: string): Promise<DeviceHealth | null> {
    const since = new Date(Date.now() - AVAILABILITY_WINDOW_MS);
    const { latest, countSince } = await this.repository.findHealth(deviceId, since);
    if (latest === null) return null;

    const availability = Math.min(100, (countSince / EXPECTED_HEARTBEATS_5M) * 100);

    return {
      device_id: deviceId,
      latest_heartbeat: latest.toISOString(),
      availability_5m: Math.round(availability * 100) / 100,
    };
  }
}

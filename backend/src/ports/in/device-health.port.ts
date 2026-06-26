import type { DeviceHealth } from "../../domain/models/device-health.ts";

export interface DeviceHealthPort {
  getHealth(deviceId: string): Promise<DeviceHealth | null>;
}

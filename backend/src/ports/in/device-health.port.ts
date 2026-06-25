import type { DeviceHealth } from "../../domain/models/device-health.ts";

/**
 * Inbound port: how the per-device health view is read regardless of
 * transport. Returns null when the device has never sent a heartbeat.
 */
export interface DeviceHealthPort {
  getHealth(deviceId: string): Promise<DeviceHealth | null>;
}

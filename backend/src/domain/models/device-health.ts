/**
 * RF-1: a device's latest heartbeat and rolling 5-minute availability, as
 * served by GET /devices/{device_id}/health. `latest_heartbeat` carries the
 * heartbeat's own `ts`, not arrival time.
 */
export interface DeviceHealth {
  device_id: string;
  latest_heartbeat: string;
  availability_5m: number;
}

export interface HeartbeatRepositoryPort {
  
  insert(deviceId: string, roomId: string, ts: string): Promise<void>;

  findHealth(deviceId: string, since: Date): Promise<{ latest: Date | null; countSince: number }>;
}

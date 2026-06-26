import type { OccupancyWindow, RoomOccupancy } from "../../domain/models/room-occupancy.ts";

export interface RoomOccupancyPort {
  getOccupancy(roomId: string, window: OccupancyWindow): Promise<RoomOccupancy | null>;
}

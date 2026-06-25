import type { OccupancyWindow, RoomOccupancy } from "../../domain/models/room-occupancy.ts";

/**
 * Inbound port: how the per-room occupancy view is read regardless of
 * transport. Returns null when the room has never received a presence event.
 */
export interface RoomOccupancyPort {
  getOccupancy(roomId: string, window: OccupancyWindow): Promise<RoomOccupancy | null>;
}

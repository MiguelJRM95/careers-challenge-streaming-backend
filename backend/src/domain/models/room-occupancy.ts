export const OCCUPANCY_WINDOWS = ["1m", "5m", "1h"] as const;
export type OccupancyWindow = (typeof OCCUPANCY_WINDOWS)[number];

/**
 * RF-2: a room's current presence state and the percentage of a window it
 * was occupied, as served by GET /rooms/{room_id}/occupancy?window=1m|5m|1h.
 * `in_room` reflects the latest presence event by `ts`, not arrival order.
 */
export interface RoomOccupancy {
  room_id: string;
  in_room: boolean;
  window: OccupancyWindow;
  occupancy_pct: number;
}

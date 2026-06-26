export const OCCUPANCY_WINDOWS = ["1m", "5m", "1h"] as const;
export type OccupancyWindow = (typeof OCCUPANCY_WINDOWS)[number];

export interface RoomOccupancy {
  room_id: string;
  in_room: boolean;
  window: OccupancyWindow;
  occupancy_pct: number;
}

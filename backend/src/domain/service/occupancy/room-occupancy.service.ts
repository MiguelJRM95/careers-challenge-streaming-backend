import type { OccupancyWindow, RoomOccupancy } from "../../models/room-occupancy.ts";
import type { ValidatedEvent } from "../../models/event.ts";
import type { RoomOccupancyPort } from "../../../ports/in/room-occupancy.port.ts";
import type { RoomOccupancyRepositoryPort } from "../../../ports/out/room-occupancy-repository.port.ts";

type PresenceEvent = Extract<ValidatedEvent, { type: "presence" }>;

const WINDOW_MS: Record<OccupancyWindow, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
};

/**
 * RF-2: per-room occupancy. Presence events are inserted with their own
 * `ts`, and `getOccupancy` recomputes both the current `in_room` state and
 * the windowed occupancy percentage straight from stored rows on every read
 * — a late-arriving presence event needs no special-case fixup, it just
 * lands in the same query the next time this room's occupancy is read.
 */
export class RoomOccupancyService implements RoomOccupancyPort {
  constructor(private readonly repository: RoomOccupancyRepositoryPort) {}

  async onPresence(event: PresenceEvent): Promise<void> {
    await this.repository.insert(event.room_id, event.ts, event.in_room);
  }

  async getOccupancy(roomId: string, window: OccupancyWindow): Promise<RoomOccupancy | null> {
    const current = await this.repository.findCurrentState(roomId);
    if (current === null) return null;

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - WINDOW_MS[window]);
    const occupiedSecs = await this.repository.findOccupiedSeconds(roomId, windowStart, windowEnd);

    // Capped at 100 as a defensive bound against clock/rounding edge cases at
    // the window boundary; rounded to 2 decimals since this is a percentage
    // for human/scorer consumption, not an intermediate value.
    const windowSecs = WINDOW_MS[window] / 1000;
    const pct = Math.min(100, (occupiedSecs / windowSecs) * 100);

    return {
      room_id: roomId,
      in_room: current.in_room,
      window,
      occupancy_pct: Math.round(pct * 100) / 100,
    };
  }
}

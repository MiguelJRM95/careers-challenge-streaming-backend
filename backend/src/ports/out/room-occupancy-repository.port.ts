/**
 * Outbound port: how the domain persists/reads presence events, regardless
 * of the storage engine. Occupancy is always recomputed from stored rows on
 * read, never tracked incrementally — a late-arriving presence event needs
 * no special fixup, it just lands in the same query the next time occupancy
 * is read, correcting the window it falls into.
 */
export interface RoomOccupancyRepositoryPort {
  /**
   * Inserts the presence event unless one already exists for the same room
   * at the same `ts` (an exact replay of an already-seen event).
   */
  insert(roomId: string, ts: string, inRoom: boolean): Promise<void>;

  /**
   * The room's current presence state: the `in_room` value of the event
   * with the greatest `ts`, not the most recently arrived one. Null when the
   * room has never received a presence event.
   */
  findCurrentState(roomId: string): Promise<{ in_room: boolean } | null>;

  /**
   * Seconds the room was occupied within [windowStart, windowEnd], computed
   * from the presence segments that overlap the window (including a segment
   * that started before windowStart, clipped to it).
   */
  findOccupiedSeconds(roomId: string, windowStart: Date, windowEnd: Date): Promise<number>;
}

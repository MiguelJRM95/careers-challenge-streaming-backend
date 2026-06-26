export interface RoomOccupancyRepositoryPort {
  
  insert(roomId: string, ts: string, inRoom: boolean): Promise<void>;

  findCurrentState(roomId: string): Promise<{ in_room: boolean } | null>;

  findOccupiedSeconds(roomId: string, windowStart: Date, windowEnd: Date): Promise<number>;
}

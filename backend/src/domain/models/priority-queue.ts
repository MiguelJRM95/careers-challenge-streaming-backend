interface QueueEntry<T> {
  priority: number;
  item: T;
}

/**
 * Min-priority queue: lower `priority` dequeues first. Stable within the
 * same priority because Array#sort is stable in V8 (Node >= 11), so FIFO
 * order is preserved for events of equal priority.
 */
export class PriorityQueue<T> {
  private items: QueueEntry<T>[] = [];

  enqueue(priority: number, item: T): void {
    this.items.push({ priority, item });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

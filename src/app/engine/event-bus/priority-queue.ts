import { EventPriority, RuntimeEventEnvelope } from './event-envelope';

interface PriorityQueueItem {
  readonly sequence: number;
  readonly envelope: RuntimeEventEnvelope;
}

/**
 * Deterministic Priority Queue for the Runtime Event Bus.
 * Dispatches items strictly by EventPriority (0 = CRITICAL first) and FIFO for equal priorities.
 */
export class EventPriorityQueue {
  private sequenceCounter = 0;
  private readonly queues = new Map<EventPriority, PriorityQueueItem[]>([
    [EventPriority.CRITICAL, []],
    [EventPriority.HIGH, []],
    [EventPriority.NORMAL, []],
    [EventPriority.LOW, []],
  ]);

  enqueue(envelope: RuntimeEventEnvelope): void {
    const priority = envelope.priority ?? EventPriority.NORMAL;
    const bucket = this.queues.get(priority) ?? this.queues.get(EventPriority.NORMAL)!;
    bucket.push({
      sequence: ++this.sequenceCounter,
      envelope,
    });
  }

  dequeue(): RuntimeEventEnvelope | undefined {
    for (const priority of [
      EventPriority.CRITICAL,
      EventPriority.HIGH,
      EventPriority.NORMAL,
      EventPriority.LOW,
    ]) {
      const bucket = this.queues.get(priority)!;
      if (bucket.length > 0) {
        return bucket.shift()!.envelope;
      }
    }
    return undefined;
  }

  drain(): RuntimeEventEnvelope[] {
    const result: RuntimeEventEnvelope[] = [];
    while (this.size > 0) {
      const next = this.dequeue();
      if (next) {
        result.push(next);
      }
    }
    return result;
  }

  get size(): number {
    let total = 0;
    for (const bucket of this.queues.values()) {
      total += bucket.length;
    }
    return total;
  }

  clear(): void {
    for (const bucket of this.queues.values()) {
      bucket.length = 0;
    }
    this.sequenceCounter = 0;
  }
}

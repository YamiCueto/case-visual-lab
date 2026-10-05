import {
  EventPriority,
  RuntimeEventEnvelope,
  RuntimeEventHandler,
  UnsubscribeFn,
} from './event-envelope';
import { EventPriorityQueue } from './priority-queue';

export interface RuntimeEventBusOptions {
  readonly maxQueueSize?: number;
  readonly onBackpressure?: (queueSize: number) => void;
}

/**
 * Universal, decoupled Runtime Event Bus for CASE Visual Lab.
 * Enables zero-dependency communication across all 10 specialized engines.
 * 100% pure TypeScript.
 */
export class RuntimeEventBus {
  private readonly subscribers = new Map<string, Set<RuntimeEventHandler>>();
  private readonly wildcardSubscribers = new Set<RuntimeEventHandler>();
  private readonly queue = new EventPriorityQueue();
  private readonly maxQueueSize: number;
  private readonly onBackpressure?: (queueSize: number) => void;

  private isFlushing = false;
  private isBatching = false;

  constructor(options: RuntimeEventBusOptions = {}) {
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.onBackpressure = options.onBackpressure;
  }

  /**
   * Subscribes a handler to a specific channel or event type.
   * Use '*' to subscribe to all events across all channels.
   */
  subscribe<T = unknown>(channel: string, handler: RuntimeEventHandler<T>): UnsubscribeFn {
    const rawHandler = handler as RuntimeEventHandler;

    if (channel === '*') {
      this.wildcardSubscribers.add(rawHandler);
      return () => {
        this.wildcardSubscribers.delete(rawHandler);
      };
    }

    let channelSet = this.subscribers.get(channel);
    if (!channelSet) {
      channelSet = new Set<RuntimeEventHandler>();
      this.subscribers.set(channel, channelSet);
    }

    channelSet.add(rawHandler);

    return () => {
      const set = this.subscribers.get(channel);
      if (set) {
        set.delete(rawHandler);
        if (set.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Publishes an event envelope into the bus.
   * If batching is not active, immediately flushes the priority queue.
   */
  publish<T = unknown>(envelope: RuntimeEventEnvelope<T>): void {
    const safeEnvelope: RuntimeEventEnvelope = {
      ...envelope,
      priority: envelope.priority ?? EventPriority.NORMAL,
      isCancelled: false,
    };

    if (this.queue.size >= this.maxQueueSize && this.onBackpressure) {
      this.onBackpressure(this.queue.size);
    }

    this.queue.enqueue(safeEnvelope);

    if (!this.isBatching && !this.isFlushing) {
      this.flush();
    }
  }

  /**
   * Pauses immediate dispatch, buffering events in the priority queue.
   */
  beginBatch(): void {
    this.isBatching = true;
  }

  /**
   * Resumes dispatch and flushes all buffered events in priority order.
   */
  flushBatch(): void {
    this.isBatching = false;
    this.flush();
  }

  /**
   * Flushes the priority queue, delivering envelopes in priority order (0 = CRITICAL first).
   */
  flush(): void {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      while (this.queue.size > 0) {
        const envelope = this.queue.dequeue();
        if (!envelope) break;

        this.dispatchEventToSubscribers(envelope);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private dispatchEventToSubscribers(envelope: RuntimeEventEnvelope): void {
    // 1. Deliver to channel-specific subscribers
    const channelSet = this.subscribers.get(envelope.channel);
    if (channelSet) {
      for (const handler of Array.from(channelSet)) {
        if (envelope.isCancellable && envelope.isCancelled) {
          break;
        }
        handler(envelope);
      }
    }

    // 2. Deliver to type-specific subscribers if channel is distinct from type
    if (envelope.type && envelope.type !== envelope.channel) {
      const typeSet = this.subscribers.get(envelope.type);
      if (typeSet) {
        for (const handler of Array.from(typeSet)) {
          if (envelope.isCancellable && envelope.isCancelled) {
            break;
          }
          handler(envelope);
        }
      }
    }

    // 3. Deliver to wildcard subscribers
    if (!(envelope.isCancellable && envelope.isCancelled)) {
      for (const handler of Array.from(this.wildcardSubscribers)) {
        if (envelope.isCancellable && envelope.isCancelled) {
          break;
        }
        handler(envelope);
      }
    }
  }

  /**
   * Returns the count of subscribers for a channel, or total count if omitted.
   */
  getSubscriberCount(channel?: string): number {
    if (channel === '*') {
      return this.wildcardSubscribers.size;
    }
    if (channel) {
      return this.subscribers.get(channel)?.size ?? 0;
    }
    let total = this.wildcardSubscribers.size;
    for (const set of this.subscribers.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Checks if there are active subscribers for a given channel.
   */
  hasSubscribers(channel: string): boolean {
    if (channel === '*') return this.wildcardSubscribers.size > 0;
    return (this.subscribers.get(channel)?.size ?? 0) > 0 || this.wildcardSubscribers.size > 0;
  }

  /**
   * Clears all subscribers and purges pending queue.
   */
  clear(): void {
    this.subscribers.clear();
    this.wildcardSubscribers.clear();
    this.queue.clear();
    this.isFlushing = false;
    this.isBatching = false;
  }

  get queueSize(): number {
    return this.queue.size;
  }
}
